import type { AnchorHTMLAttributes } from 'react'
import Link from 'next/link'
import type { MDXComponents } from 'mdx/types'

export const mdxComponents: MDXComponents = {
  h1: (props) => (
    <h1
      className="mb-4 mt-10 text-[32px] font-bold tracking-v2-display text-v2-foreground"
      {...props}
    />
  ),
  h2: (props) => (
    <h2
      className="mb-4 mt-12 scroll-mt-20 text-[26px] font-bold tracking-v2-tight text-v2-foreground"
      {...props}
    />
  ),
  h3: (props) => (
    <h3
      className="mb-3 mt-10 scroll-mt-20 text-[20px] font-bold text-v2-foreground"
      {...props}
    />
  ),
  h4: (props) => (
    <h4
      className="mb-2 mt-8 text-[17px] font-bold text-v2-foreground"
      {...props}
    />
  ),
  p: (props) => (
    <p
      className="my-5 text-[17px] leading-[1.7] text-v2-foreground"
      {...props}
    />
  ),
  ul: (props) => (
    <ul
      className="my-5 ml-6 list-disc space-y-2 text-[17px] leading-[1.7] text-v2-foreground marker:text-v2-brand"
      {...props}
    />
  ),
  ol: (props) => (
    <ol
      className="my-5 ml-6 list-decimal space-y-2 text-[17px] leading-[1.7] text-v2-foreground marker:font-bold marker:text-v2-brand"
      {...props}
    />
  ),
  li: (props) => <li className="leading-[1.65]" {...props} />,
  blockquote: (props) => (
    <blockquote
      className="my-7 rounded-r-lg border-l-[3px] border-l-v2-brand bg-v2-brand-soft/40 py-3 pl-5 pr-4 italic text-v2-foreground"
      {...props}
    />
  ),
  code: (props) => (
    <code
      className="rounded-[4px] bg-v2-surface-sunken px-1.5 py-0.5 font-v2-mono text-[0.88em] text-v2-foreground"
      {...props}
    />
  ),
  pre: (props) => (
    <pre
      className="my-7 overflow-x-auto rounded-xl border border-v2-deep bg-v2-deep p-5 font-v2-mono text-[13px] leading-[1.7] text-white/90"
      {...props}
    />
  ),
  a: ({
    href,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement>) => {
    if (typeof href === 'string' && href.startsWith('/')) {
      return (
        <Link
          href={href}
          className="font-medium text-v2-brand underline underline-offset-2 hover:text-v2-brand-hover"
          {...props}
        >
          {children}
        </Link>
      )
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-v2-brand underline underline-offset-2 hover:text-v2-brand-hover"
        {...props}
      >
        {children}
      </a>
    )
  },
  table: (props) => (
    <div className="my-7 overflow-x-auto rounded-lg border border-v2-border">
      <table className="w-full border-collapse text-[14px]" {...props} />
    </div>
  ),
  th: (props) => (
    <th
      className="border-b border-v2-border bg-v2-surface-subtle px-3 py-2 text-left font-v2-mono text-[11px] font-semibold uppercase tracking-v2-wide text-v2-foreground-muted"
      {...props}
    />
  ),
  td: (props) => (
    <td
      className="border-b border-v2-border-subtle px-3 py-2 text-v2-foreground"
      {...props}
    />
  ),
  hr: (props) => (
    <hr className="my-12 border-v2-border-subtle" {...props} />
  ),
}
