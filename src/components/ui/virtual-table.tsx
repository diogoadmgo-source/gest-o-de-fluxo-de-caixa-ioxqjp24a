import React, { useRef, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface VirtualTableProps {
  data: any[]
  rowHeight: number
  visibleHeight: number
  renderRow: (item: any, style: React.CSSProperties) => React.ReactNode
  className?: string
  header?: React.ReactNode
}

export function VirtualTable({
  data,
  rowHeight,
  visibleHeight,
  renderRow,
  className,
  header,
}: VirtualTableProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      if (rootRef.current) {
        setScrollTop(rootRef.current.scrollTop)
      }
    }
    const element = rootRef.current
    if (element) {
      element.addEventListener('scroll', handleScroll)
      return () => element.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const totalHeight = data.length * rowHeight
  const startIndex = Math.floor(scrollTop / rowHeight)
  const endIndex = Math.min(
    data.length,
    Math.ceil((scrollTop + visibleHeight) / rowHeight) + 2, // Overscan
  )

  const visibleItems = []
  for (let i = startIndex; i < endIndex; i++) {
    visibleItems.push(
      renderRow(data[i], {
        position: 'absolute',
        top: i * rowHeight,
        height: rowHeight,
        width: '100%',
      }),
    )
  }

  return (
    <div
      ref={rootRef}
      className={cn(
        'overflow-y-auto relative border rounded-md bg-background',
        className,
      )}
      style={{ height: visibleHeight }}
    >
      {header && (
        <div className="sticky top-0 z-10 bg-background border-b">{header}</div>
      )}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems}
      </div>
    </div>
  )
}
