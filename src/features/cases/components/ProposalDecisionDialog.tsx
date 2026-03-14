import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import type { Proposal } from '@/types'
import { ProposalTypeLabels } from '@/types/enums'
import { useAcceptProposal, useRejectProposal } from '../hooks/useCaseDetail'

interface ProposalDecisionDialogProps {
  proposal: Proposal
  caseId: string
  mode: 'accept' | 'reject'
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProposalDecisionDialog({
  proposal,
  caseId,
  mode,
  open,
  onOpenChange,
}: ProposalDecisionDialogProps) {
  const acceptProposal = useAcceptProposal()
  const rejectProposal = useRejectProposal()
  const [decisionNote, setDecisionNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const isAccept = mode === 'accept'
  const isPending = acceptProposal.isPending || rejectProposal.isPending

  const formatMRU = (amount: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'MRU',
      minimumFractionDigits: 0,
    }).format(amount)

  const itemCount = proposal.items?.length || 0

  const handleSubmit = async () => {
    setError(null)

    if (!isAccept && !decisionNote.trim()) {
      setError('Le motif de rejet est obligatoire')
      return
    }

    try {
      if (isAccept) {
        await acceptProposal.mutateAsync({
          proposal_id: proposal.id,
          case_id: caseId,
          decision_note: decisionNote || undefined,
        })
        toast.success(
          `Proposition acceptee — ${itemCount} promesse${itemCount > 1 ? 's' : ''} generee${itemCount > 1 ? 's' : ''}`
        )
      } else {
        await rejectProposal.mutateAsync({
          proposal_id: proposal.id,
          case_id: caseId,
          decision_note: decisionNote,
        })
        toast.success('Proposition rejetee')
      }
      setDecisionNote('')
      onOpenChange(false)
    } catch (err: unknown) {
      console.error('Proposal decision error:', err)
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : JSON.stringify(err)
      setError(message)
      toast.error(isAccept ? "Erreur lors de l'acceptation" : 'Erreur lors du rejet')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isAccept ? 'Accepter la proposition' : 'Rejeter la proposition'}
          </DialogTitle>
          <DialogDescription>
            {isAccept ? (
              <>
                En acceptant cette proposition ({ProposalTypeLabels[proposal.type]}
                {proposal.amount ? ` — ${formatMRU(proposal.amount)}` : ''}),{' '}
                <strong>{itemCount} promesse{itemCount > 1 ? 's' : ''}</strong> de paiement
                {itemCount > 1 ? ' seront generees' : ' sera generee'} automatiquement.
              </>
            ) : (
              'Veuillez indiquer le motif de rejet de cette proposition.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resume des echeances pour accept */}
          {isAccept && proposal.items && proposal.items.length > 0 && (
            <div className="rounded-md border bg-muted/50 p-3 text-sm space-y-1">
              <p className="font-medium mb-2">Promesses qui seront creees :</p>
              {proposal.items.map((item, i) => (
                <div key={item.id || i} className="flex justify-between">
                  <span className="text-muted-foreground">
                    {new Date(item.due_date).toLocaleDateString('fr-FR')}
                  </span>
                  <span className="font-medium">{formatMRU(item.amount)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {isAccept ? 'Note (optionnelle)' : 'Motif de rejet *'}
            </label>
            <Textarea
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
              placeholder={isAccept ? 'Commentaire...' : 'Indiquer le motif du rejet...'}
              rows={3}
            />
          </div>

          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            variant={isAccept ? 'default' : 'destructive'}
          >
            {isPending
              ? 'Traitement...'
              : isAccept
                ? 'Accepter'
                : 'Rejeter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
