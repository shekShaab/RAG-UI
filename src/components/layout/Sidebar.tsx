"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FileText, Search, Tag, Settings,
  Database, Network, BarChart2, ThumbsUp, SearchCode,
  Cable, AlertCircle,
} from "lucide-react";

const NAV = [
  { href: "/",                  icon: LayoutDashboard, label: "Dashboard"   },
  { href: "/documents",         icon: FileText,        label: "Documents"   },
  { href: "/search",            icon: SearchCode,      label: "Search"      },
  { href: "/query",             icon: Search,          label: "Query KB"    },
  { href: "/categories",        icon: Tag,             label: "Categories"  },
  null, // divider
  { href: "/knowledge",         icon: Network,         label: "Knowledge"   },
  { href: "/connectors",        icon: Cable,           label: "Connectors"  },
  { href: "/analytics",         icon: BarChart2,       label: "Analytics"   },
  { href: "/analytics/gaps",    icon: AlertCircle,     label: "Gaps"        },
  { href: "/feedback",          icon: ThumbsUp,        label: "Feedback"    },
  { href: "/eval",              icon: BarChart2,       label: "Evaluation"  },
  null, // divider
  { href: "/settings",          icon: Settings,        label: "Settings"    },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="w-56 shrink-0 bg-slate-900 flex flex-col">
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
            <Database size={14} className="text-white" />
          </div>
          <span className="text-white font-medium text-sm">RAG Platform</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
        {NAV.map((item, i) =>
          item === null ? (
            <div key={i} className="my-2 border-t border-slate-800" />
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                path === item.href || (item.href !== "/" && path.startsWith(item.href))
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <item.icon size={15} />
              {item.label}
            </Link>
          )
        )}
      </nav>

      <div className="px-4 py-4 border-t border-slate-800">
        <p className="text-slate-500 text-xs">v3.0.0 · key: abhi1</p>
      </div>
    </aside>
  );
}
