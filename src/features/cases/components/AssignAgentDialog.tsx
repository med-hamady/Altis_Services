import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { UserCheck } from 'lucide-react'
import { useAgents } from '@/features/users/hooks/useUsers'
import { useAssignAgent } from '../hooks/useCaseDetail'

interface AssignAgentDialogProps {
  caseId: string
  currentAgentId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AssignAgentDialog({ caseId, currentAgentId, open, onOpenChange }: AssignAgentDialogProps) {
  const { data: agents, isLoading } = useAgents()
  const assignAgent = useAssignAgent()
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(currentAgentId)
  const [serverError, setServerError] = useState<string | null>(null)

  const activeAgents = agents?.filter((a) => a.is_active) || []

  const handleAssign = async () => {
    setServerError(null)
    try {
      await assignAgent.mutateAsync({ caseId, agentId: selectedAgentId })
      onOpenChange(false)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      setServerError(message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Affecter un agent</DialogTitle>
          <DialogDescription>
            Sélectionnez l'agent terrain à affecter à ce dossier
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Chargement...</p>
          ) : activeAgents.length > 0 ? (
            <>
              {/* Option: Désaffecter */}
              <button
                type="button"
                onClick={() => setSelectedAgentId(null)}
                className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent ${
                  selectedAgentId === null ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Non affecté</p>
                  <p className="text-xs text-muted-foreground">Retirer l'affectation</p>
                </div>
              </button>

              {activeAgents.map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => setSelectedAgentId(agent.id)}
                  className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent ${
                    selectedAgentId === agent.id ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <UserCheck className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{agent.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[agent.sector, agent.zone].filter(Boolean).join(' — ') || agent.email}
                    </p>
                  </div>
                  {agent.id === currentAgentId && (
                    <span className="ml-auto text-xs text-muted-foreground">(actuel)</span>
                  )}
                </button>
              ))}
            </>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Aucun agent actif disponible. Créez d'abord un agent.
            </p>
          )}
        </div>

        {serverError && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {serverError}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleAssign}
            disabled={assignAgent.isPending || selectedAgentId === currentAgentId}
          >
            {assignAgent.isPending ? 'Affectation...' : 'Affecter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
