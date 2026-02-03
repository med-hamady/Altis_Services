import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdminsTable } from '../components/AdminsTable'
import { AgentsTable } from '../components/AgentsTable'
import { BankUsersTable } from '../components/BankUsersTable'

export function UsersListPage() {
  const [activeTab, setActiveTab] = useState('admins')

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Utilisateurs</h1>
        <p className="text-muted-foreground">
          Gestion des administrateurs, agents et utilisateurs bancaires
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="admins">Administrateurs</TabsTrigger>
          <TabsTrigger value="agents">Agents terrain</TabsTrigger>
          <TabsTrigger value="bank_users">Utilisateurs Banque</TabsTrigger>
        </TabsList>

        <TabsContent value="admins" className="mt-6">
          <AdminsTable />
        </TabsContent>

        <TabsContent value="agents" className="mt-6">
          <AgentsTable />
        </TabsContent>

        <TabsContent value="bank_users" className="mt-6">
          <BankUsersTable />
        </TabsContent>
      </Tabs>
    </div>
  )
}
