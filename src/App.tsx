import { useState, useEffect, useRef } from 'react';
import { Bell, BellOff, Activity, AlertCircle, Plus, Trash2 } from 'lucide-react';
import './style.css';

declare global {
  interface Window {
    electronAPI?: {
      showNotification: (title: string, body: string) => void;
    };
  }
}

interface TrackingTask {
  id: string;
  url: string;
  caseNumber: string;
}

const toVisitNumber = (value: string | null | undefined) => {
  const match = value?.match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : null;
};

const hasVisitNumber = (doc: Document, selector: string, target: number) =>
  Array.from(doc.querySelectorAll(selector)).some(node => toVisitNumber(node.textContent) === target);

const notify = (title: string, body: string) => {
  if (window.electronAPI) {
    window.electronAPI.showNotification(title, body);
    return;
  }

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body });
  }
};

function Tracker({ task, onRemove }: { task: TrackingTask; onRemove: (id: string) => void }) {
  const [isTracking, setIsTracking] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const timerRef = useRef<number | null>(null);
  const activeEventKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let active = true;

    const checkStatus = async () => {
      if (!active) return;
      try {
        setErrorMsg('');
        const response = await fetch(task.url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const htmlText = await response.text();
        if (!active) return;
        setLastChecked(new Date());

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');

        // Extract all progress numbers and their statuses
        const progressNodes = doc.querySelectorAll('.progress-number');
        const statuses = Array.from(progressNodes).map(node => {
          const clone = node.cloneNode(true) as Element;
          const tagNode = clone.querySelector('div');
          const tagText = tagNode ? tagNode.textContent?.trim() : '';
          if (tagNode) clone.removeChild(tagNode);
          const numberText = clone.textContent?.trim() || '';
          return { number: toVisitNumber(numberText), status: tagText };
        });

        // Check our case number
        const targetNumber = toVisitNumber(task.caseNumber);
        if (targetNumber === null) {
          throw new Error('號碼格式錯誤');
        }

        const paddedCaseNumber = task.caseNumber.trim();
        const targetStatusObj = statuses.find(s => s.number === targetNumber);
        const targetStatus = targetStatusObj ? targetStatusObj.status : null;

        const isCheckedIn = targetStatus === '已報到';
        const isNow = hasVisitNumber(doc, '.now-number .number', targetNumber);
        const isNext = hasVisitNumber(doc, '.next-number .number', targetNumber);
        const isBiggest = hasVisitNumber(doc, '.biggest-number .number', targetNumber);
        const alertEvents = [
          { key: 'checked-in', active: isCheckedIn, label: '已報到' },
          { key: 'now-number', active: isNow, label: '目前燈號' },
          { key: 'next-number', active: isNext, label: '預計叫號' },
          { key: 'biggest-number', active: isBiggest, label: '已叫最大號' },
        ];
        const activeEvents = alertEvents.filter(event => event.active);

        let currentStatusDesc = `目前狀態：${targetStatus || '未找到號碼'}`;
        if (activeEvents.length > 0) {
          currentStatusDesc += `；已進入：${activeEvents.map(event => event.label).join('、')}`;
        }
        if (active) {
          setStatusMsg(currentStatusDesc);
        }

        // Trigger notification if criteria met
        const newEvents = activeEvents.filter(event => !activeEventKeysRef.current.has(event.key));
        if (newEvents.length > 0) {
          const labels = newEvents.map(event => event.label).join('、');
          notify('NTUH 叫號通知', `您的號碼 ${paddedCaseNumber} 已進入：${labels}`);
        }
        activeEventKeysRef.current = new Set(activeEvents.map(event => event.key));

      } catch (err: any) {
        if (active) {
          setErrorMsg(err.message || 'Fetch failed');
          setIsTracking(false);
        }
      }
    };

    if (isTracking) {
      activeEventKeysRef.current = new Set();
      checkStatus();
      timerRef.current = window.setInterval(checkStatus, 60000); // Check every 60s
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      active = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTracking, task.url, task.caseNumber]);

  return (
    <div className="tracker-card">
      <div className="tracker-header">
        <div className="tracker-title">
          <strong>號碼：{task.caseNumber}</strong>
          <span className="tracker-url" title={task.url}>{task.url}</span>
        </div>
        <button type="button" onClick={() => onRemove(task.id)} className="btn-icon btn-remove" title="移除追蹤">
          <Trash2 size={18} />
        </button>
      </div>
      
      {errorMsg && (
        <div className="error-box mt-2">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {isTracking ? (
        <div className="status-box mt-2">
          <div className="pulse-indicator">
            <span className="dot"></span>
            正在監控中...
            <button type="button" onClick={() => setIsTracking(false)} className="btn-small btn-danger ml-auto">
              停止
            </button>
          </div>
          {lastChecked && (
            <div className="last-checked">
              最後檢查時間：{lastChecked.toLocaleTimeString()}
            </div>
          )}
          {statusMsg && (
            <div className="status-msg">
              {statusMsg}
            </div>
          )}
        </div>
      ) : (
        <div className="status-box mt-2 stopped">
          <div className="stopped-indicator">
            <BellOff size={16} />
            已停止追蹤
            <button type="button" onClick={() => setIsTracking(true)} className="btn-small btn-primary ml-auto">
              重新開始
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [url, setUrl] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [tasks, setTasks] = useState<TrackingTask[]>([]);
  const [inputError, setInputError] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const nextUrl = url.trim();
    const nextCaseNumber = caseNumber.trim();
    if (!nextUrl || !nextCaseNumber) {
      setInputError('請輸入網址與號碼');
      return;
    }

    if (!/^\d+$/.test(nextCaseNumber)) {
      setInputError('請輸入數字號碼');
      return;
    }
    
    // Fallback ask for permission if not in electron
    if (!window.electronAPI && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    setTasks(prev => [{ id: Date.now().toString() + Math.random().toString(), url: nextUrl, caseNumber: nextCaseNumber }, ...prev]);
    setCaseNumber('');
    setInputError('');
  };

  const handleRemove = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="container">
      <div className="card main-card">
        <div className="header">
          <Activity className="icon-main" />
          <h1>NTUH 叫號通知器</h1>
        </div>
        
        <form onSubmit={handleAdd} className="form-group">
          <div className="input-group">
            <label>看診進度公開網址：</label>
            <input 
              type="url" 
              value={url} 
              onChange={e => setUrl(e.target.value)} 
              placeholder="https://reg.ntuh.gov.tw/..."
              required
            />
          </div>
          
          <div className="input-group">
            <label>追蹤號碼：</label>
            <input 
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={caseNumber} 
              onChange={e => setCaseNumber(e.target.value)} 
              placeholder="例如: 35"
              required
            />
          </div>

          {inputError && (
            <div className="error-box">
              <AlertCircle size={16} />
              <span>{inputError}</span>
            </div>
          )}

          <div className="button-group">
            <button type="submit" className="btn btn-primary">
              <Plus size={18} />
              新增追蹤
            </button>
          </div>
        </form>
      </div>

      <div className="trackers-panel">
        <div className="list-header">
          <Bell className="icon-main" />
          <h2>追蹤清單</h2>
        </div>

        {tasks.length > 0 ? (
          <div className="trackers-list">
            {tasks.map(task => (
              <Tracker key={task.id} task={task} onRemove={handleRemove} />
            ))}
          </div>
        ) : (
          <div className="empty-state">尚未新增追蹤號碼</div>
        )}
      </div>
    </div>
  );
}

export default App;
