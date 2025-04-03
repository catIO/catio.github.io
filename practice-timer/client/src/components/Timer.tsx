import { formatTime } from "@/lib/formatTime";

interface TimerProps {
  timeRemaining: number;
  totalTime: number;
  mode: 'work' | 'break';
  isRunning: boolean;
}

export default function Timer({ timeRemaining, totalTime, mode, isRunning }: TimerProps) {
  const progress = ((totalTime - timeRemaining) / totalTime) * 100;
  const formattedTime = formatTime(timeRemaining);
  
  return (
    <div className="flex flex-col items-center justify-center space-y-4 w-full">
      <div className="relative w-48 h-48 flex items-center justify-center">
        {/* SVG Progress Circle */}
        <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            className="stroke-muted fill-none"
            cx="50"
            cy="50"
            r="45"
            strokeWidth="10"
          />
          <circle
            className={`${mode === 'work' ? 'stroke-red-500' : 'stroke-green-500'} fill-none transition-all duration-500 ease-in-out`}
            cx="50"
            cy="50"
            r="45"
            strokeWidth="10"
            strokeDasharray={`${2 * Math.PI * 45}`}
            strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
          />
        </svg>
        
        {/* Timer Display */}
        <div className="absolute inset-0 flex items-center justify-center text-center">
          <span className="text-4xl font-bold tracking-tighter">
            {formattedTime}
          </span>
        </div>
      </div>
    </div>
  );
}
