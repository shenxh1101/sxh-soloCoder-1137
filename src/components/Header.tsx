import { Link, useLocation } from 'react-router-dom';
import { Workflow, FileCode, GitCompare } from 'lucide-react';

export default function Header() {
  const location = useLocation();

  const linkClass = (path: string) =>
    `flex items-center gap-1.5 rounded px-3 py-1.5 text-sm transition-all ${
      location.pathname === path
        ? 'bg-accent/10 text-accent'
        : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="flex items-center justify-between h-12 px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-accent/20">
            <Workflow className="h-4 w-4 text-accent" />
          </div>
          <span className="text-sm font-semibold text-text-primary tracking-tight">
            网络配置生成器
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link to="/" className={linkClass('/')}>
            <Workflow className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">工作台</span>
          </Link>
          <Link to="/templates" className={linkClass('/templates')}>
            <FileCode className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">模板</span>
          </Link>
          <Link to="/diff" className={linkClass('/diff')}>
            <GitCompare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">对比</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}