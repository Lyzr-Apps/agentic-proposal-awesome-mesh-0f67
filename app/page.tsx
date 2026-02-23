'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { uploadAndTrainDocument } from '@/lib/ragKnowledgeBase'
import { copyToClipboard } from '@/lib/clipboard'
import { cn } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { FiSend, FiUpload, FiDownload, FiRefreshCw, FiFile, FiTrash2, FiClock, FiSettings, FiLayout, FiCheckCircle, FiAlertCircle, FiCopy, FiX, FiMenu, FiFileText, FiGrid, FiList, FiCode } from 'react-icons/fi'

// ─── Constants ───────────────────────────────────────────────────────────────

const MANAGER_AGENT_ID = '699c1d3ee413c889bdd1947d'
const RAG_ID = '699c1cbbb45a5c2df18ccf9b'

const THEME_VARS = {
  '--background': '0 0% 99%',
  '--foreground': '30 5% 15%',
  '--card': '0 0% 100%',
  '--card-foreground': '30 5% 15%',
  '--primary': '40 30% 45%',
  '--primary-foreground': '0 0% 100%',
  '--secondary': '30 10% 95%',
  '--secondary-foreground': '30 5% 20%',
  '--accent': '40 40% 50%',
  '--accent-foreground': '30 5% 15%',
  '--muted': '30 8% 92%',
  '--muted-foreground': '30 5% 50%',
  '--border': '30 10% 88%',
  '--input': '30 8% 82%',
  '--ring': '40 30% 45%',
  '--destructive': '0 50% 45%',
  '--destructive-foreground': '0 0% 100%',
  '--popover': '0 0% 100%',
  '--popover-foreground': '30 5% 15%',
  '--sidebar-background': '30 8% 97%',
  '--sidebar-border': '30 10% 90%',
  '--radius': '0rem',
} as React.CSSProperties

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProposalData {
  htmlContent: string
  deckDepth: string
  generatedAt: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface UploadedFile {
  name: string
  status: 'uploading' | 'success' | 'error'
  error?: string
}

interface HistoryEntry {
  id: string
  htmlContent: string
  deckDepth: string
  generatedAt: string
  messageCount: number
}

interface SettingsState {
  toneInstitutional: boolean
  suppressMarketing: boolean
  defaultDeckDepth: '15' | '30'
  exportFormat: 'html' | 'markdown'
}

// ─── Sample Data ─────────────────────────────────────────────────────────────

const SAMPLE_HTML = `<header>
<h1>Digital Transformation Strategy for Meridian Financial</h1>
<p class="meta">Client: Meridian Financial Group | Deck: 15-slide Summary | Slides: 15</p>
</header>

<section n="1" id="lc01">
<div class="body">
    <h1>Executive Summary</h1>
    <p>Meridian Financial faces a critical inflection point in digital capabilities. We propose an 18-month transformation roadmap across four core pillars targeting operational modernization and revenue growth.</p>
    <p>Projected outcomes include 35% operational efficiency gain and 22% revenue uplift, with a total investment of $4.2M and a validated 14-month payback period.</p>
    <p><strong>We recommend immediate approval of this transformation initiative given the competitive urgency and strong risk-adjusted returns demonstrated in our financial modeling.</strong></p>
</div>
</section>

<section n="2" id="lc02">
<div class="body">
    <h1>Current State Assessment</h1>
    <p>Legacy core banking platform limits product velocity significantly. Customer NPS declined 12 points year-over-year, driven primarily by digital experience gaps across mobile and web channels.</p>
    <p>Manual processes consume 40% of middle-office capacity. Competitor analysis reveals Meridian trailing in six of eight digital capability areas measured by industry benchmarks.</p>
    <p><strong>Without intervention, current trajectory projects further NPS erosion and an estimated $6.2M in unrealized revenue over the next 24 months.</strong></p>
</div>
</section>

<section n="3" id="lc03">
<div class="body">
    <h1>Proposed Solution Architecture</h1>
    <p>Pillar 1: API-first core modernization with phased migration. Pillar 2: Unified customer data platform delivering a comprehensive 360-degree client view across all touchpoints.</p>
    <p>Pillar 3: Intelligent automation for credit decisioning and compliance workflows. Pillar 4: Real-time analytics and executive dashboard suite enabling data-driven decision making at all levels.</p>
    <p><strong>Each pillar is interdependent but structured for phased delivery, enabling risk containment while maintaining transformation momentum across the program.</strong></p>
</div>
</section>

<section n="4" id="lc04">
<div class="body">
    <h1>ROI and Financial Impact</h1>
    <p>Year 1 savings of $1.8M from automation of manual processes. Year 2 revenue uplift of $3.2M projected from improved customer conversion rates across digital and branch channels.</p>
    <p>Year 3 cumulative NPV reaches $8.7M at 12% discount rate. Risk-adjusted IRR of 42% across the full transformation program using conservative baseline assumptions.</p>
    <p><strong>Financial projections validated by Meridian CFO office. Conservative scenario shows breakeven at month 14; optimistic scenario achieves breakeven at month 10.</strong></p>
</div>
</section>

<section n="5" id="lc05">
<div class="body">
    <h1>Phased Delivery Roadmap</h1>
    <p>Phase 1 (Months 1-4): Foundation and data platform setup with early-win deliverables. Phase 2 (Months 5-10): Core system migration and automation deployment targeting highest-impact workflows first.</p>
    <p>Phase 3 (Months 11-15): Analytics layer build-out and performance optimization. Phase 4 (Months 16-18): Full organizational rollout with structured change management and adoption tracking.</p>
    <p><strong>Decision gates between phases ensure investment committee oversight at each stage, with documented go/no-go criteria and rollback provisions.</strong></p>
</div>
</section>

<footer class="validation">
<p><strong>Validation Complete</strong> -- All financial projections cross-referenced with industry benchmarks. ROI assumptions validated against 3 comparable transformations. Risk factors documented with mitigation strategies for each phase.</p>
</footer>`

const SAMPLE_MESSAGES: ChatMessage[] = [
  {
    role: 'user',
    content: 'We need a proposal for Meridian Financial Group. They are a mid-market financial services company looking to modernize their core banking platform.',
    timestamp: '10:32 AM',
  },
  {
    role: 'assistant',
    content: 'Understood. I have captured the client context for Meridian Financial Group. Key details noted:\n\n- **Industry:** Financial Services\n- **Segment:** Mid-market\n- **Primary Need:** Core banking platform modernization\n\nPlease share any additional context such as pain points, budget constraints, or competitive pressures. When ready, select your deck depth and click Generate Proposal.',
    timestamp: '10:32 AM',
  },
  {
    role: 'user',
    content: 'Their NPS has dropped 12 points. Manual processes are a big problem in the middle office. Budget is around $4-5M over 18 months.',
    timestamp: '10:34 AM',
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractTitleFromHtml(html: string): string {
  const headerMatch = html.match(/<header[^>]*>[\s\S]*?<h1[^>]*>([\s\S]*?)<\/h1>/i)
  if (headerMatch?.[1]) return headerMatch[1].replace(/<[^>]+>/g, '').trim()
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  if (h1Match?.[1]) return h1Match[1].replace(/<[^>]+>/g, '').trim()
  return 'Untitled Proposal'
}

function extractClientFromHtml(html: string): string {
  const metaMatch = html.match(/<p[^>]*class="meta"[^>]*>([\s\S]*?)<\/p>/i)
  if (metaMatch?.[1]) {
    const clientMatch = metaMatch[1].match(/Client:\s*([^|<]+)/i)
    if (clientMatch?.[1]) return clientMatch[1].trim()
  }
  return 'Unknown Client'
}

function countSectionsInHtml(html: string): number {
  const matches = html.match(/<section[\s>]/gi)
  return matches?.length ?? 0
}

function htmlToMarkdown(html: string): string {
  let md = html
    .replace(/<header[^>]*>/gi, '')
    .replace(/<\/header>/gi, '')
    .replace(/<footer[^>]*>/gi, '\n---\n')
    .replace(/<\/footer>/gi, '')
    .replace(/<section[^>]*>/gi, '\n')
    .replace(/<\/section>/gi, '\n')
    .replace(/<div[^>]*>/gi, '')
    .replace(/<\/div>/gi, '')
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n')
    .replace(/<li>([\s\S]*?)<\/li>/gi, '- $1\n')
    .replace(/<ul>/gi, '')
    .replace(/<\/ul>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return md
}

// ─── Markdown Renderer ──────────────────────────────────────────────────────

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-medium">
        {part}
      </strong>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  )
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return (
            <h4 key={i} className="font-medium text-sm mt-3 mb-1 font-serif tracking-wide">
              {line.slice(4)}
            </h4>
          )
        if (line.startsWith('## '))
          return (
            <h3 key={i} className="font-medium text-base mt-3 mb-1 font-serif tracking-wide">
              {line.slice(3)}
            </h3>
          )
        if (line.startsWith('# '))
          return (
            <h2 key={i} className="font-medium text-lg mt-4 mb-2 font-serif tracking-wide">
              {line.slice(2)}
            </h2>
          )
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <li key={i} className="ml-4 list-disc text-sm leading-relaxed">
              {formatInline(line.slice(2))}
            </li>
          )
        if (/^\d+\.\s/.test(line))
          return (
            <li key={i} className="ml-4 list-decimal text-sm leading-relaxed">
              {formatInline(line.replace(/^\d+\.\s/, ''))}
            </li>
          )
        if (!line.trim()) return <div key={i} className="h-1" />
        return (
          <p key={i} className="text-sm leading-relaxed">
            {formatInline(line)}
          </p>
        )
      })}
    </div>
  )
}

// ─── ErrorBoundary ───────────────────────────────────────────────────────────

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-medium mb-2 font-serif tracking-wide">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm font-light tracking-wider uppercase"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function SidebarNav({
  activeView,
  onNavigate,
  collapsed,
  onToggle,
}: {
  activeView: string
  onNavigate: (view: string) => void
  collapsed: boolean
  onToggle: () => void
}) {
  const items = [
    { id: 'workspace', label: 'Proposals', icon: FiLayout },
    { id: 'history', label: 'History', icon: FiClock },
    { id: 'settings', label: 'Settings', icon: FiSettings },
  ]

  return (
    <div
      className={cn(
        'h-full flex flex-col border-r border-border bg-[hsl(var(--sidebar-background))] transition-all duration-300',
        collapsed ? 'w-[60px]' : 'w-[220px]'
      )}
    >
      <div className="p-3 flex items-center justify-between border-b border-border">
        {!collapsed && (
          <span className="text-xs font-light tracking-[0.15em] uppercase text-muted-foreground">
            Navigation
          </span>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 hover:bg-muted transition-colors"
        >
          <FiMenu className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
      <nav className="flex-1 py-2">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = activeView === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary border-r-2 border-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && (
                <span className="font-light tracking-wider">{item.label}</span>
              )}
            </button>
          )
        })}
      </nav>
      <div className="p-3 border-t border-border">
        {!collapsed && (
          <div className="text-xs text-muted-foreground font-light leading-relaxed">
            <span className="block tracking-wider">Proposal Studio</span>
            <span className="text-[10px] opacity-60">v1.0</span>
          </div>
        )}
      </div>
    </div>
  )
}

function ChatPanel({
  messages,
  inputValue,
  onInputChange,
  onSend,
  uploadedFiles,
  onFileUpload,
  onRemoveFile,
  isUploading,
  loading,
}: {
  messages: ChatMessage[]
  inputValue: string
  onInputChange: (val: string) => void
  onSend: () => void
  uploadedFiles: UploadedFile[]
  onFileUpload: (files: FileList) => void
  onRemoveFile: (name: string) => void
  isUploading: boolean
  loading: boolean
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      if (e.dataTransfer.files.length > 0) {
        onFileUpload(e.dataTransfer.files)
      }
    },
    [onFileUpload]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="font-serif text-base font-normal tracking-[0.1em] text-foreground">
          Context & Conversation
        </h2>
        <p className="text-xs text-muted-foreground font-light mt-1 leading-relaxed">
          Describe your client, deal context, and requirements
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <FiFileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground font-light tracking-wide">
                Start by describing your client and deal context.
              </p>
              <p className="text-xs text-muted-foreground/60 font-light mt-2">
                Upload supporting documents for richer proposals.
              </p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'flex',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[85%] px-4 py-3',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground border border-border'
                )}
              >
                <div className="text-sm font-light leading-relaxed">
                  {renderMarkdown(msg.content)}
                </div>
                <p className="text-[10px] mt-2 opacity-50 font-light">
                  {msg.timestamp}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Upload Zone */}
      <div
        className={cn(
          'mx-4 mb-2 border border-dashed p-3 transition-colors cursor-pointer',
          isDragOver ? 'border-primary bg-primary/5' : 'border-border'
        )}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onFileUpload(e.target.files)
              e.target.value = ''
            }
          }}
        />
        <div className="flex items-center gap-2 text-muted-foreground">
          <FiUpload className="w-3.5 h-3.5" />
          <span className="text-xs font-light tracking-wider">
            {isUploading ? 'Uploading...' : 'Drop PDF, DOCX, or TXT files here'}
          </span>
        </div>
      </div>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="mx-4 mb-2 flex flex-wrap gap-1.5">
          {uploadedFiles.map((f) => (
            <Badge
              key={f.name}
              variant={f.status === 'error' ? 'destructive' : 'secondary'}
              className="text-[10px] font-light gap-1 pr-1"
            >
              <FiFile className="w-2.5 h-2.5" />
              <span className="max-w-[100px] truncate">{f.name}</span>
              {f.status === 'uploading' && (
                <FiRefreshCw className="w-2.5 h-2.5 animate-spin" />
              )}
              {f.status === 'success' && (
                <FiCheckCircle className="w-2.5 h-2.5 text-green-600" />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onRemoveFile(f.name)
                }}
                className="ml-0.5 hover:text-destructive"
              >
                <FiX className="w-2.5 h-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Textarea
            placeholder="Describe the client, industry, pain points, deal size..."
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            className="flex-1 text-sm font-light resize-none border-border"
            disabled={loading}
          />
          <Button
            onClick={onSend}
            disabled={!inputValue.trim() || loading}
            className="self-end px-3"
            size="icon"
          >
            {loading ? (
              <FiRefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <FiSend className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

function ProposalPreview({
  proposal,
  loading,
  generatingSection,
  progressPercent,
  onRegenerate,
  onExportHTML,
  onExportMarkdown,
  onCopyToClipboard,
}: {
  proposal: ProposalData | null
  loading: boolean
  generatingSection: string
  progressPercent: number
  onRegenerate: () => void
  onExportHTML: () => void
  onExportMarkdown: () => void
  onCopyToClipboard: () => void
}) {
  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <FiRefreshCw className="w-6 h-6 text-primary animate-spin mb-4" />
        <p className="text-sm font-serif tracking-wide text-foreground mb-2">
          Generating Proposal
        </p>
        <p className="text-xs text-muted-foreground font-light mb-4">
          {generatingSection || 'Processing your request...'}
        </p>
        <div className="w-64">
          <Progress value={progressPercent} className="h-1" />
        </div>
        <p className="text-[10px] text-muted-foreground font-light mt-2">
          {progressPercent}% complete
        </p>
      </div>
    )
  }

  if (!proposal) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-16 h-16 border border-border flex items-center justify-center mb-6">
          <FiLayout className="w-6 h-6 text-muted-foreground/30" />
        </div>
        <p className="text-sm font-serif tracking-wide text-foreground mb-2">
          Proposal Preview
        </p>
        <p className="text-xs text-muted-foreground font-light text-center max-w-xs leading-relaxed">
          Start by describing your client and deal context in the conversation panel. Upload supporting documents, then generate your proposal.
        </p>
      </div>
    )
  }

  const title = extractTitleFromHtml(proposal.htmlContent)
  const client = extractClientFromHtml(proposal.htmlContent)
  const sectionCount = countSectionsInHtml(proposal.htmlContent)

  return (
    <div className="flex flex-col h-full">
      {/* Proposal Header */}
      <div className="p-5 border-b border-border">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="font-serif text-lg font-normal tracking-[0.08em] text-foreground leading-snug">
              {title}
            </h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="outline" className="text-[10px] font-light tracking-wider">
                {client}
              </Badge>
              <Badge variant="secondary" className="text-[10px] font-light tracking-wider">
                {proposal.deckDepth}
              </Badge>
              <Badge variant="secondary" className="text-[10px] font-light tracking-wider">
                {sectionCount} sections
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={onCopyToClipboard} className="h-8 w-8">
                    <FiCopy className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy HTML to clipboard</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={onExportHTML} className="h-8 w-8">
                    <FiDownload className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export HTML</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={onExportMarkdown} className="h-8 w-8">
                    <FiFileText className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export Markdown</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Separator orientation="vertical" className="h-5 mx-1" />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={onRegenerate} className="h-8 text-xs font-light tracking-wider gap-1.5">
                    <FiRefreshCw className="w-3 h-3" />
                    Regenerate
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Regenerate entire proposal</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Rendered HTML Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          <div
            className="slide-html-content"
            dangerouslySetInnerHTML={{ __html: proposal.htmlContent }}
          />
        </div>
      </ScrollArea>
    </div>
  )
}

function HistoryView({
  history,
  onLoad,
  onDelete,
  viewMode,
  onViewModeChange,
}: {
  history: HistoryEntry[]
  onLoad: (entry: HistoryEntry) => void
  onDelete: (id: string) => void
  viewMode: 'grid' | 'list'
  onViewModeChange: (mode: 'grid' | 'list') => void
}) {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-lg font-normal tracking-[0.1em] text-foreground">
            Proposal History
          </h2>
          <p className="text-xs text-muted-foreground font-light mt-1">
            {history.length} saved proposal{history.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-muted p-0.5">
          <button
            onClick={() => onViewModeChange('grid')}
            className={cn(
              'p-1.5 transition-colors',
              viewMode === 'grid' ? 'bg-background shadow-sm' : 'text-muted-foreground'
            )}
          >
            <FiGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={cn(
              'p-1.5 transition-colors',
              viewMode === 'list' ? 'bg-background shadow-sm' : 'text-muted-foreground'
            )}
          >
            <FiList className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {history.length === 0 && (
        <div className="text-center py-16">
          <FiClock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground font-light">
            No proposals saved yet
          </p>
        </div>
      )}

      <div
        className={cn(
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'space-y-3'
        )}
      >
        {history.map((entry) => {
          const entryTitle = extractTitleFromHtml(entry.htmlContent ?? '')
          const entryClient = extractClientFromHtml(entry.htmlContent ?? '')
          return (
            <Card key={entry.id} className="border-border shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-serif font-normal tracking-wide leading-snug truncate">
                  {entryTitle}
                </CardTitle>
                <CardDescription className="text-[10px] font-light">
                  {entryClient}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 pb-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="secondary" className="text-[9px] font-light">
                    {entry.deckDepth}
                  </Badge>
                  <Badge variant="secondary" className="text-[9px] font-light">
                    {entry.messageCount} message{entry.messageCount !== 1 ? 's' : ''}
                  </Badge>
                  <Badge variant="outline" className="text-[9px] font-light">
                    {entry.generatedAt}
                  </Badge>
                </div>
              </CardContent>
              <CardFooter className="px-4 pb-4 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs font-light tracking-wider h-8"
                  onClick={() => onLoad(entry)}
                >
                  Load
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => onDelete(entry.id)}
                >
                  <FiTrash2 className="w-3 h-3" />
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function SettingsView({
  settings,
  onUpdate,
}: {
  settings: SettingsState
  onUpdate: (update: Partial<SettingsState>) => void
}) {
  return (
    <div className="p-6 max-w-lg space-y-8">
      <div>
        <h2 className="font-serif text-lg font-normal tracking-[0.1em] text-foreground">
          Settings
        </h2>
        <p className="text-xs text-muted-foreground font-light mt-1">
          Configure proposal generation preferences
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-xs font-light tracking-[0.15em] uppercase text-muted-foreground">
            Tone Configuration
          </h3>
          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="text-sm font-light">Institutional Tone</Label>
              <p className="text-[10px] text-muted-foreground font-light mt-0.5">
                Formal, conservative language suitable for enterprise clients
              </p>
            </div>
            <Switch
              checked={settings.toneInstitutional}
              onCheckedChange={(checked) => onUpdate({ toneInstitutional: checked })}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="text-sm font-light">Suppress Marketing Language</Label>
              <p className="text-[10px] text-muted-foreground font-light mt-0.5">
                Remove promotional phrasing and hyperbolic claims
              </p>
            </div>
            <Switch
              checked={settings.suppressMarketing}
              onCheckedChange={(checked) => onUpdate({ suppressMarketing: checked })}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-xs font-light tracking-[0.15em] uppercase text-muted-foreground">
            Defaults
          </h3>
          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="text-sm font-light">Default Deck Depth</Label>
              <p className="text-[10px] text-muted-foreground font-light mt-0.5">
                Number of slides in generated proposals
              </p>
            </div>
            <div className="flex items-center gap-2 bg-muted p-0.5">
              <button
                onClick={() => onUpdate({ defaultDeckDepth: '15' })}
                className={cn(
                  'px-3 py-1 text-xs font-light tracking-wider transition-colors',
                  settings.defaultDeckDepth === '15'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground'
                )}
              >
                15
              </button>
              <button
                onClick={() => onUpdate({ defaultDeckDepth: '30' })}
                className={cn(
                  'px-3 py-1 text-xs font-light tracking-wider transition-colors',
                  settings.defaultDeckDepth === '30'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground'
                )}
              >
                30
              </button>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="text-sm font-light">Export Format</Label>
              <p className="text-[10px] text-muted-foreground font-light mt-0.5">
                Default format for proposal export
              </p>
            </div>
            <div className="flex items-center gap-2 bg-muted p-0.5">
              <button
                onClick={() => onUpdate({ exportFormat: 'html' })}
                className={cn(
                  'px-3 py-1 text-xs font-light tracking-wider transition-colors',
                  settings.exportFormat === 'html'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground'
                )}
              >
                HTML
              </button>
              <button
                onClick={() => onUpdate({ exportFormat: 'markdown' })}
                className={cn(
                  'px-3 py-1 text-xs font-light tracking-wider transition-colors',
                  settings.exportFormat === 'markdown'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground'
                )}
              >
                Markdown
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AgentStatusPanel({
  activeAgentId,
  loading,
}: {
  activeAgentId: string | null
  loading: boolean
}) {
  const agents = [
    { id: MANAGER_AGENT_ID, name: 'Proposal Orchestrator', role: 'Manager -- coordinates 15 sub-agents' },
  ]

  return (
    <div className="border-t border-border p-3 bg-muted/30">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-light tracking-[0.15em] uppercase text-muted-foreground">
          Agent Status
        </span>
      </div>
      {agents.map((agent) => {
        const isActive = loading && activeAgentId === agent.id
        return (
          <div key={agent.id} className="flex items-center gap-2 py-1">
            <div
              className={cn(
                'w-1.5 h-1.5 rounded-full flex-shrink-0',
                isActive ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/30'
              )}
            />
            <span className="text-[10px] font-light text-foreground/70 truncate">
              {agent.name}
            </span>
            {isActive && (
              <FiRefreshCw className="w-2.5 h-2.5 text-primary animate-spin flex-shrink-0 ml-auto" />
            )}
          </div>
        )
      })}
      <p className="text-[9px] text-muted-foreground/50 font-light mt-1">
        The manager orchestrates 15 specialized sub-agents internally.
      </p>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Page() {
  // ─── State ───
  const [activeView, setActiveView] = useState('workspace')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [proposal, setProposal] = useState<ProposalData | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [generatingSection, setGeneratingSection] = useState('')
  const [progressPercent, setProgressPercent] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [deckDepth, setDeckDepth] = useState<'15' | '30'>('15')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyViewMode, setHistoryViewMode] = useState<'grid' | 'list'>('grid')
  const [settings, setSettings] = useState<SettingsState>({
    toneInstitutional: true,
    suppressMarketing: true,
    defaultDeckDepth: '15',
    exportFormat: 'html',
  })
  const [showSampleData, setShowSampleData] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  // ─── Load History & Settings ───
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('proposal-history-v2')
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory)
        if (Array.isArray(parsed)) {
          setHistory(parsed)
        }
      }
    } catch {
      // Ignore
    }
    try {
      const savedSettings = localStorage.getItem('proposal-settings')
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings)
        if (parsed && typeof parsed === 'object') {
          setSettings((prev) => ({ ...prev, ...parsed }))
          if (parsed.defaultDeckDepth) {
            setDeckDepth(parsed.defaultDeckDepth)
          }
        }
      }
    } catch {
      // Ignore
    }
  }, [])

  // ─── Persist History ───
  useEffect(() => {
    try {
      localStorage.setItem('proposal-history-v2', JSON.stringify(history))
    } catch {
      // Ignore
    }
  }, [history])

  // ─── Persist Settings ───
  useEffect(() => {
    try {
      localStorage.setItem('proposal-settings', JSON.stringify(settings))
    } catch {
      // Ignore
    }
  }, [settings])

  // ─── Sample Data Toggle ───
  useEffect(() => {
    if (showSampleData) {
      setMessages(SAMPLE_MESSAGES)
      setProposal({
        htmlContent: SAMPLE_HTML,
        deckDepth: '15-slide Summary',
        generatedAt: new Date().toISOString(),
      })
      setUploadedFiles([
        { name: 'Meridian_RFP.pdf', status: 'success' },
        { name: 'Financial_Data.docx', status: 'success' },
      ])
    } else {
      setMessages([])
      setProposal(null)
      setUploadedFiles([])
      setError(null)
    }
  }, [showSampleData])

  // ─── Build Prompt ───
  const buildPrompt = useCallback(() => {
    const allMessages = messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .join('\n\n')

    const toneDirective = settings.toneInstitutional
      ? 'Use an institutional, formal tone appropriate for senior executives.'
      : 'Use a professional yet approachable tone.'
    const marketingDirective = settings.suppressMarketing
      ? 'Suppress all marketing language and hyperbolic claims.'
      : ''

    return `Generate a ${deckDepth}-slide executive proposal based on the following context.

Setting: Venture capital investment review.
Audience: Internal investment committee partners.
${toneDirective}
${marketingDirective}

Client Context:
${allMessages}

OUTPUT FORMAT: Return ONLY raw HTML. No JSON, no markdown, no code fences.

Start with:
<header>
<h1>{Proposal Title}</h1>
<p class="meta">Client: {name} | Deck: ${deckDepth}-slide | Slides: ${deckDepth}</p>
</header>

Then each slide as:
<section n="{number}" id="lc{zero_padded}">
<div class="body">
    <h1>{Slide Title}</h1>
    <p>[30-40 words, factual]</p>
    <p>[30-40 words, data-grounded]</p>
    <p><strong>[30-40 words, key recommendation]</strong></p>
</div>
</section>

End with:
<footer class="validation">
<p>[Validation summary]</p>
</footer>`
  }, [messages, deckDepth, settings])

  // ─── Extract HTML from agent response ───
  const extractHtmlFromResponse = useCallback((result: any): string => {
    let htmlContent = ''
    const responseResult = result?.response?.result

    if (typeof responseResult === 'string') {
      htmlContent = responseResult
    } else if (responseResult?.html_content && typeof responseResult.html_content === 'string') {
      htmlContent = responseResult.html_content
    } else if (result?.response?.message && typeof result.response.message === 'string') {
      htmlContent = result.response.message
    } else if (result?.raw_response && typeof result.raw_response === 'string') {
      htmlContent = result.raw_response
    } else if (typeof responseResult === 'object' && responseResult !== null) {
      // Last resort: stringify
      htmlContent = JSON.stringify(responseResult)
    }

    // Clean up code fences if present
    htmlContent = htmlContent
      .replace(/^```html?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    return htmlContent
  }, [])

  // ─── Send Message ───
  const handleSend = useCallback(() => {
    if (!inputValue.trim()) return
    const now = new Date()
    const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const userMsg: ChatMessage = {
      role: 'user',
      content: inputValue.trim(),
      timestamp,
    }
    setMessages((prev) => [...prev, userMsg])
    setInputValue('')

    const assistantMsg: ChatMessage = {
      role: 'assistant',
      content:
        'Context received and noted. Continue adding details or upload supporting documents. When ready, click **Generate Proposal** to create your deck.',
      timestamp,
    }
    setMessages((prev) => [...prev, assistantMsg])
  }, [inputValue])

  // ─── File Upload ───
  const handleFileUpload = useCallback(async (files: FileList) => {
    setIsUploading(true)
    const fileArray = Array.from(files)
    for (const file of fileArray) {
      const uploadEntry: UploadedFile = { name: file.name, status: 'uploading' }
      setUploadedFiles((prev) => [...prev, uploadEntry])
      try {
        const result = await uploadAndTrainDocument(RAG_ID, file)
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.name === file.name
              ? { ...f, status: result.success ? 'success' : 'error', error: result.error }
              : f
          )
        )
      } catch {
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.name === file.name ? { ...f, status: 'error', error: 'Upload failed' } : f
          )
        )
      }
    }
    setIsUploading(false)
  }, [])

  const handleRemoveFile = useCallback((name: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.name !== name))
  }, [])

  // ─── Generate Proposal ───
  const handleGenerate = useCallback(async () => {
    if (messages.filter((m) => m.role === 'user').length === 0) {
      setError('Please provide some client context before generating a proposal.')
      return
    }
    setLoading(true)
    setError(null)
    setActiveAgentId(MANAGER_AGENT_ID)
    setProgressPercent(10)
    setGeneratingSection('Initializing proposal generation...')

    try {
      const prompt = buildPrompt()

      const progressInterval = setInterval(() => {
        setProgressPercent((prev) => {
          if (prev >= 85) return prev
          const increment = Math.random() * 8 + 2
          return Math.min(prev + increment, 85)
        })
        setGeneratingSection((prev) => {
          const phases = [
            'Analyzing client context...',
            'Generating Executive Summary...',
            'Building solution architecture...',
            'Drafting implementation timeline...',
            'Calculating ROI projections...',
            'Validating financial models...',
            'Assembling final proposal...',
          ]
          const idx = phases.indexOf(prev)
          if (idx < phases.length - 1) return phases[idx + 1]
          return prev
        })
      }, 3000)

      const result = await callAIAgent(prompt, MANAGER_AGENT_ID)

      clearInterval(progressInterval)
      setProgressPercent(100)
      setGeneratingSection('Complete')

      if (result.success) {
        const htmlContent = extractHtmlFromResponse(result)

        if (htmlContent) {
          const newProposal: ProposalData = {
            htmlContent,
            deckDepth: `${deckDepth}-slide`,
            generatedAt: new Date().toISOString(),
          }
          setProposal(newProposal)

          const extractedTitle = extractTitleFromHtml(htmlContent)
          const sectionCount = countSectionsInHtml(htmlContent)

          const now = new Date()
          const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: `Proposal generated successfully: **${extractedTitle}** with ${sectionCount} sections. Review the preview panel. Use **Regenerate** to create a new version if needed.`,
              timestamp,
            },
          ])

          const historyEntry: HistoryEntry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            htmlContent,
            deckDepth: `${deckDepth} slides`,
            generatedAt: now.toLocaleDateString(),
            messageCount: messages.filter((m) => m.role === 'user').length,
          }
          setHistory((prev) => [historyEntry, ...prev])
        } else {
          setError('The agent returned an empty response. Please try again.')
        }
      } else {
        setError(result?.error ?? 'Failed to generate proposal. Please try again.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setLoading(false)
      setActiveAgentId(null)
      setProgressPercent(0)
      setGeneratingSection('')
    }
  }, [messages, buildPrompt, deckDepth, extractHtmlFromResponse])

  // ─── Regenerate Entire Proposal ───
  const handleRegenerate = useCallback(async () => {
    if (messages.filter((m) => m.role === 'user').length === 0) {
      setError('No client context available. Please add context before regenerating.')
      return
    }
    await handleGenerate()
  }, [handleGenerate, messages])

  // ─── Export Functions ───
  const exportToHTML = useCallback(() => {
    if (!proposal?.htmlContent) return
    const title = extractTitleFromHtml(proposal.htmlContent)
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
body { font-family: Georgia, 'Times New Roman', serif; max-width: 900px; margin: 0 auto; padding: 2rem; color: #2b2724; background: #fcfcfc; }
header { margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 2px solid #e0d9d1; }
header h1 { font-size: 1.75rem; font-weight: 400; letter-spacing: 0.08em; margin: 0 0 0.5rem 0; }
header .meta { font-size: 0.8125rem; font-weight: 300; color: #8a8078; }
section { margin-bottom: 2rem; padding: 1.5rem; border: 1px solid #e0d9d1; }
.body h1 { font-size: 1.25rem; font-weight: 400; letter-spacing: 0.06em; border-bottom: 1px solid #e0d9d1; padding-bottom: 0.5rem; margin-bottom: 0.75rem; }
.body p { font-size: 0.875rem; font-weight: 300; line-height: 1.8; margin-bottom: 0.625rem; }
strong { font-weight: 500; color: #8b7236; }
footer { margin-top: 2rem; padding-top: 1rem; border-top: 2px solid #e0d9d1; font-size: 0.8125rem; font-weight: 300; color: #8a8078; }
</style>
</head>
<body>
${proposal.htmlContent}
</body>
</html>`

    const blob = new Blob([fullHtml], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/\s+/g, '_')}.html`
    a.click()
    URL.revokeObjectURL(url)
  }, [proposal])

  const exportToMarkdown = useCallback(() => {
    if (!proposal?.htmlContent) return
    const md = htmlToMarkdown(proposal.htmlContent)
    const title = extractTitleFromHtml(proposal.htmlContent)
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/\s+/g, '_')}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [proposal])

  const handleCopyToClipboard = useCallback(async () => {
    if (!proposal?.htmlContent) return
    const success = await copyToClipboard(proposal.htmlContent)
    if (success) {
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    }
  }, [proposal])

  // ─── History Actions ───
  const handleLoadHistory = useCallback((entry: HistoryEntry) => {
    setProposal({
      htmlContent: entry.htmlContent ?? '',
      deckDepth: entry.deckDepth ?? '',
      generatedAt: entry.generatedAt ?? '',
    })
    setActiveView('workspace')
  }, [])

  const handleDeleteHistory = useCallback((id: string) => {
    setHistory((prev) => prev.filter((e) => e.id !== id))
  }, [])

  // ─── Settings Update ───
  const handleSettingsUpdate = useCallback((update: Partial<SettingsState>) => {
    setSettings((prev) => ({ ...prev, ...update }))
  }, [])

  // ─── Render ───
  return (
    <ErrorBoundary>
      <div style={THEME_VARS} className="min-h-screen h-screen bg-background text-foreground flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-card flex-shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="font-serif text-base font-normal tracking-[0.12em] text-foreground">
              Agentic Proposal Studio
            </h1>
            <Separator orientation="vertical" className="h-5" />
            <span className="text-[10px] font-light text-muted-foreground tracking-wider uppercase">
              AI-Powered Deck Builder
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Sample Data Toggle */}
            <div className="flex items-center gap-2">
              <Label className="text-[10px] font-light tracking-wider uppercase text-muted-foreground">
                Sample Data
              </Label>
              <Switch
                checked={showSampleData}
                onCheckedChange={setShowSampleData}
              />
            </div>

            <Separator orientation="vertical" className="h-5" />

            {/* Deck Depth Toggle */}
            <div className="flex items-center gap-2">
              <Label className="text-[10px] font-light tracking-wider uppercase text-muted-foreground">
                Deck Depth
              </Label>
              <div className="flex items-center bg-muted p-0.5">
                <button
                  onClick={() => setDeckDepth('15')}
                  className={cn(
                    'px-3 py-1 text-xs font-light tracking-wider transition-colors',
                    deckDepth === '15'
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Summary (15)
                </button>
                <button
                  onClick={() => setDeckDepth('30')}
                  className={cn(
                    'px-3 py-1 text-xs font-light tracking-wider transition-colors',
                    deckDepth === '30'
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Full (30)
                </button>
              </div>
            </div>

            <Separator orientation="vertical" className="h-5" />

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={loading || messages.filter((m) => m.role === 'user').length === 0}
              className="text-xs font-light tracking-[0.1em] uppercase h-9 px-5"
            >
              {loading ? (
                <>
                  <FiRefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Generating
                </>
              ) : (
                'Generate Proposal'
              )}
            </Button>

            {/* Export Buttons */}
            {proposal && (
              <>
                <Separator orientation="vertical" className="h-5" />
                <div className="flex items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={exportToHTML}
                          className="text-[10px] font-light tracking-wider h-8 px-3"
                        >
                          <FiCode className="w-3 h-3 mr-1" />
                          HTML
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Export as HTML document</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={exportToMarkdown}
                          className="text-[10px] font-light tracking-wider h-8 px-3"
                        >
                          <FiFileText className="w-3 h-3 mr-1" />
                          MD
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Export Markdown</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopyToClipboard}
                          className="text-[10px] font-light tracking-wider h-8 px-3"
                        >
                          <FiCopy className="w-3 h-3 mr-1" />
                          Copy
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy HTML to clipboard</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {copySuccess && (
                    <span className="text-[10px] text-green-600 font-light ml-1">Copied</span>
                  )}
                </div>
              </>
            )}
          </div>
        </header>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <SidebarNav
            activeView={activeView}
            onNavigate={setActiveView}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((prev) => !prev)}
          />

          {/* Main Area */}
          <div className="flex-1 flex overflow-hidden">
            {activeView === 'workspace' && (
              <>
                {/* Chat Panel */}
                <div className="w-[40%] min-w-[320px] border-r border-border flex flex-col overflow-hidden">
                  <ChatPanel
                    messages={messages}
                    inputValue={inputValue}
                    onInputChange={setInputValue}
                    onSend={handleSend}
                    uploadedFiles={uploadedFiles}
                    onFileUpload={handleFileUpload}
                    onRemoveFile={handleRemoveFile}
                    isUploading={isUploading}
                    loading={loading}
                  />
                  {/* Error Display */}
                  {error && (
                    <div className="mx-4 mb-3 p-3 border border-destructive/30 bg-destructive/5 flex items-start gap-2">
                      <FiAlertCircle className="w-3.5 h-3.5 text-destructive mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-destructive font-light">{error}</p>
                        <button
                          onClick={() => setError(null)}
                          className="text-[10px] text-muted-foreground hover:text-foreground mt-1 underline"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Agent Status */}
                  <AgentStatusPanel activeAgentId={activeAgentId} loading={loading} />
                </div>

                {/* Proposal Preview */}
                <div className="flex-1 flex flex-col overflow-hidden bg-background">
                  <ProposalPreview
                    proposal={proposal}
                    loading={loading}
                    generatingSection={generatingSection}
                    progressPercent={progressPercent}
                    onRegenerate={handleRegenerate}
                    onExportHTML={exportToHTML}
                    onExportMarkdown={exportToMarkdown}
                    onCopyToClipboard={handleCopyToClipboard}
                  />
                </div>
              </>
            )}

            {activeView === 'history' && (
              <ScrollArea className="flex-1">
                <HistoryView
                  history={history}
                  onLoad={handleLoadHistory}
                  onDelete={handleDeleteHistory}
                  viewMode={historyViewMode}
                  onViewModeChange={setHistoryViewMode}
                />
              </ScrollArea>
            )}

            {activeView === 'settings' && (
              <ScrollArea className="flex-1">
                <SettingsView
                  settings={settings}
                  onUpdate={handleSettingsUpdate}
                />
              </ScrollArea>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}
