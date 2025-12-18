import React, { useRef, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

export interface VirtualTableColumn<T> {
  header: React.ReactNode
  accessorKey?: keyof T
  cell?: (item: T) => React.ReactNode
  className?: string
  width?: string | number
}

interface VirtualTableProps<T> {
  data: T[]
  columns: VirtualTableColumn<T>[]
  rowHeight?: number
  visibleHeight?: number | string
  onRowClick?: (item: T) => void
  className?: string
}

export function VirtualTable<T>({
  data,
  columns,
  rowHeight = 52,
  visibleHeight = 600,
  onRowClick,
  className,
}: VirtualTableProps<T>) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState<number>(
    typeof visibleHeight === 'number' ? visibleHeight : 600,
  )

  useEffect(() => {
    const handleScroll = () => {
      if (rootRef.current) {
        // Use requestAnimationFrame for smoother scroll handling
        requestAnimationFrame(() => {
          setScrollTop(rootRef.current?.scrollTop || 0)
        })
      }
    }
    const element = rootRef.current
    if (element) {
      element.addEventListener('scroll', handleScroll)
      // Initial height calc if using flex/auto
      if (typeof visibleHeight !== 'number') {
        setContainerHeight(element.clientHeight || 600)
      }
      return () => element.removeEventListener('scroll', handleScroll)
    }
  }, [visibleHeight])

  // Update container height on resize if dynamic
  useEffect(() => {
    if (typeof visibleHeight !== 'number' && rootRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerHeight(entry.contentRect.height)
        }
      })
      resizeObserver.observe(rootRef.current)
      return () => resizeObserver.disconnect()
    }
  }, [visibleHeight])

  const totalHeight = data.length * rowHeight
  const startIndex = Math.floor(scrollTop / rowHeight)
  const endIndex = Math.min(
    data.length,
    Math.ceil((scrollTop + containerHeight) / rowHeight) + 3, // Overscan
  )

  const visibleItems = []
  for (let i = startIndex; i < endIndex; i++) {
    const item = data[i]
    if (!item) continue

    visibleItems.push(
      <div
        key={i}
        className={cn(
          'absolute w-full flex items-center border-b transition-colors hover:bg-muted/50',
          onRowClick ? 'cursor-pointer' : '',
        )}
        style={{
          top: i * rowHeight,
          height: rowHeight,
        }}
        onClick={() => onRowClick?.(item)}
      >
        {columns.map((col, idx) => (
          <div
            key={idx}
            className={cn('px-4 align-middle text-sm', col.className)}
            style={{ width: col.width || `${100 / columns.length}%` }}
          >
            {col.cell
              ? col.cell(item)
              : col.accessorKey
                ? String(item[col.accessorKey] || '')
                : null}
          </div>
        ))}
      </div>,
    )
  }

  return (
    <div
      className={cn('border rounded-md bg-background flex flex-col', className)}
      style={{ height: visibleHeight }}
    >
      {/* Header */}
      <div className="flex w-full h-12 border-b bg-muted/50 sticky top-0 z-10 shrink-0">
        {columns.map((col, idx) => (
          <div
            key={idx}
            className={cn(
              'px-4 h-full flex items-center text-left font-medium text-muted-foreground text-sm',
              col.className,
            )}
            style={{ width: col.width || `${100 / columns.length}%` }}
          >
            {col.header}
          </div>
        ))}
      </div>

      {/* Virtual Body */}
      <div ref={rootRef} className="flex-1 overflow-y-auto relative w-full">
        <div style={{ height: totalHeight, position: 'relative' }}>
          {visibleItems}
        </div>
        {data.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            Nenhum registro encontrado.
          </div>
        )}
      </div>
    </div>
  )
}
