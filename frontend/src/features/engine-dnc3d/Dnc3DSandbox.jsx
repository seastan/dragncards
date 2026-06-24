import { useState } from 'react';
import Dnc3DTable from './Dnc3DTable';

// Dev-only sandbox for iterating on the dnc3d engine without a backend/room.
// Accessible at /dev/dnc3d-sandbox
export default function Dnc3DSandbox() {
  const [tiltDeg, setTiltDeg] = useState(15);
  const [tableOpacity, setTableOpacity] = useState(100);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000' }}>
      <Dnc3DTable tiltDeg={tiltDeg} tableOpacity={tableOpacity} />
      <div style={{
        position: 'fixed', bottom: '3vh', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: '1vw', zIndex: 99999,
      }}>
        <label style={{ color: 'rgba(255,255,255,0.4)', font: '0.6vw/1 sans-serif', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
          tilt {tiltDeg}°
        </label>
        <input
          type="range" min={0} max={45} value={tiltDeg}
          onChange={e => setTiltDeg(Number(e.target.value))}
          style={{ width: '7vw', accentColor: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
        />
        <label style={{ color: 'rgba(255,255,255,0.4)', font: '0.6vw/1 sans-serif', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
          table {tableOpacity}%
        </label>
        <input
          type="range" min={0} max={100} value={tableOpacity}
          onChange={e => setTableOpacity(Number(e.target.value))}
          style={{ width: '7vw', accentColor: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
        />
      </div>
    </div>
  );
}
