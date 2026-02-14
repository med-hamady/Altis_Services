import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, UserCheck, Pencil, Trash2, MoreVertical } from 'lucide-react'
import { useAgents, useDeleteAgent } from '../hooks/useUsers'
import { AgentDialog } from './AgentDialog'
import { EditAgentDialog } from './EditAgentDialog'
import type { Agent } from '@/types'

export function AgentsTable() {
  const { data: agents, isLoading } = useAgents()
  const deleteAgent = useDeleteAgent()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editAgent, setEditAgent] = useState<Agent | null>(null)

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet agent ?')) {
      await deleteAgent.mutateAsync(id)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Agents terrain</CardTitle>
              <CardDescription>
                {agents?.length || 0} agent(s)
              </CardDescription>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvel agent
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          ) : agents && agents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom complet</TableHead>
                  <TableHead className="hidden sm:table-cell">Utilisateur</TableHead>
                  <TableHead className="hidden md:table-cell">Téléphone</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-primary" />
                        <span className="font-medium">{agent.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{agent.username || agent.email.split('@')[0]}</TableCell>
                    <TableCell className="hidden md:table-cell">{agent.phone || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={agent.is_active ? 'default' : 'secondary'}>
                        {agent.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setEditAgent(agent)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(agent.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UserCheck className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Aucun agent</h3>
              <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Créer un agent
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AgentDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <EditAgentDialog
        agent={editAgent}
        open={!!editAgent}
        onOpenChange={(open) => { if (!open) setEditAgent(null) }}
      />
    </>
  )
}
