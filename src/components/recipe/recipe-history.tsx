import { useMemo } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { useCookingStore } from '@/store/cookingStore'
import { Clock, Calendar, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { cn } from '@/lib/utils'

interface RecipeHistoryProps {
  recipeId: string
  compact?: boolean
}

export function RecipeHistory({ recipeId, compact = false }: RecipeHistoryProps) {
  const sessions = useCookingStore((state) => state.sessions)

  const history = useMemo(() => {
    return Object.values(sessions)
      .filter((session) => 
        session.recipeId === recipeId && 
        session.status === 'completed'
      )
      .sort((a, b) => 
        new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()
      )
  }, [sessions, recipeId])

  if (compact) {
    return (
      <HoverCard>
        <HoverCardTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 text-muted-foreground">
            <Clock className="mr-2 h-4 w-4" />
            {history.length}x cooked
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </HoverCardTrigger>
        <HoverCardContent className="w-80">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Cooking History</h4>
            {history.length > 0 ? (
              <div className="divide-y">
                {history.map((session) => (
                  <div
                    key={session.startedAt}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="text-sm">
                      {formatDistanceToNow(new Date(session.lastActiveAt))} ago
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {Object.keys(session.notes).length} notes
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No cooking history yet
              </p>
            )}
          </div>
        </HoverCardContent>
      </HoverCard>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Cooking History</h3>
        <div className="text-sm text-muted-foreground">
          {history.length} sessions
        </div>
      </div>

      {history.length > 0 ? (
        <div className="divide-y rounded-lg border">
          {history.map((session) => (
            <div
              key={session.startedAt}
              className="p-4 transition-colors hover:bg-muted/50"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {format(new Date(session.lastActiveAt), 'PPP')}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(session.lastActiveAt))} ago
                </div>
              </div>

              {Object.entries(session.notes).length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="text-sm font-medium">Notes:</div>
                  {Object.entries(session.notes).map(([step, note]) => (
                    <div
                      key={step}
                      className="rounded-md bg-muted p-2 text-sm"
                    >
                      <span className="font-medium">Step {parseInt(step) + 1}:</span>{' '}
                      {note}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-2 flex gap-2">
                {Object.entries(session.stepRatings).map(([step, rating]) => (
                  <div
                    key={step}
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-1 text-xs",
                      rating === 'up' 
                        ? "bg-green-100 text-green-700" 
                        : "bg-red-100 text-red-700"
                    )}
                  >
                    Step {parseInt(step) + 1}: {rating === 'up' ? '👍' : '👎'}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <div className="text-muted-foreground">No cooking history yet</div>
        </div>
      )}
    </div>
  )
} 