import { supabase } from '@/lib/supabase/client'

interface PerformanceMetric {
  route: string
  action: string
  duration: number
  meta?: any
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private queue: PerformanceMetric[] = []
  private batchSize = 5
  private flushInterval = 10000 // 10s
  private timer: NodeJS.Timeout | null = null

  private constructor() {
    this.startTimer()
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  public log(route: string, action: string, startTime: number, meta?: any) {
    const duration = performance.now() - startTime
    this.queue.push({
      route,
      action,
      duration,
      meta,
    })

    if (this.queue.length >= this.batchSize) {
      this.flush()
    }
  }

  private async flush() {
    if (this.queue.length === 0) return

    const itemsToFlush = [...this.queue]
    this.queue = []

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('performance_logs').insert(
          itemsToFlush.map((item) => ({
            user_id: user.id,
            route: item.route,
            action: item.action,
            duration_ms: item.duration,
            meta: item.meta,
          })),
        )
      }
    } catch (error) {
      console.error('Failed to flush performance logs', error)
      // Re-queue items if needed, or drop to avoid memory leak
    }
  }

  private startTimer() {
    this.timer = setInterval(() => {
      this.flush()
    }, this.flushInterval)
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance()

export const usePerformanceMeasure = (route: string, action: string) => {
  const start = performance.now()
  return {
    end: (meta?: any) => performanceMonitor.log(route, action, start, meta),
  }
}
