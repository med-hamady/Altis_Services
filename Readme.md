Cahier des charges — Application Web de Gestion du Recouvrement

Entreprise : Altis Services SUARL
Version : 1.0
Objectif : Concevoir et développer une application web pour gérer les dossiers de recouvrement confiés par les banques, suivre le travail des agents terrain, et donner aux banques une visibilité sur leurs dossiers uniquement.

1) Contexte et besoin
Altis Services est une agence de recouvrement. Ses clients sont des banques.
Chaque banque possède des débiteurs :
Personne Physique (PP) : individu
Personne Morale (PM) : société/institution
Les banques confient à Altis des dossiers de recouvrement (débiteur + dette + pièces).
Altis affecte ces dossiers à des agents de terrain qui exécutent des actions (appels, visites, relances) et saisissent leurs résultats.

2) Périmètre du projet
Inclus (MVP obligatoire)
Gestion des banques clientes (Altis)
Gestion des utilisateurs (Admin, Agents, Utilisateurs banque)
Gestion des débiteurs PP/PM
Gestion des dossiers (création, mise à jour, affectation, statut)
Journal des actions terrain (appels/visites + compte-rendu + prochaine étape)
Gestion des promesses de paiement + échéancier simple
Gestion des paiements (déclaré/validé/rejeté) + justificatifs
Gestion des documents (banque + terrain)
Tableaux de bord + rapports (filtrage, export)
Sécurité et cloisonnement banque (une banque ne voit que ses dossiers)
Hors périmètre (optionnel / phase 2)
Géolocalisation automatique
Signature électronique
Intégration API bancaire
Module contentieux/avocat complet
IA/score de risque
3) Acteurs et rôles
Rôles
Admin Altis
Accès complet : toutes banques, tous dossiers, gestion utilisateurs, clôture/validation
Agent terrain
Accès limité : uniquement dossiers affectés + création d’actions + ajout preuves + promesses/paiements (déclaration)
Utilisateur Banque
Accès lecture : uniquement dossiers de sa banque + consultation historique + rapports (selon visibilité)
Règle critique (multi-tenant)
Chaque dossier possède un bank_id
Un utilisateur banque ne peut accéder qu’aux dossiers avec le même bank_id
4) Workflow métier
Création/Import dossier (Admin) → Statut = Nouveau
Qualification + Affectation (Admin) → Statut = Affecté
Traitement terrain (Agent) → Statut = En cours
Promesse (Agent) → Statut = Promesse
Paiement (Agent déclare) → Admin valide → Paiement partiel ou Payé
Clôture (Admin) → Clos (motif : Payé / Injoignable / Litige / etc.)
Banque suit l’avancement en lecture sur ses dossiers
5) Fonctionnalités détaillées
5.1 Authentification & sécurité
Connexion (email + mot de passe) ou autre méthode vlidée
Gestion session + déconnexion
Réinitialisation mot de passe
Journalisation des événements sensibles (login, suppression, validation)
Critère d’acceptation
Un utilisateur banque ne voit jamais des dossiers d’une autre banque.
5.2 Gestion des banques (Admin)
CRUD banque : nom, contacts, adresse, statut actif/inactif
Paramètres : formats références, règles de visibilité documents, etc.
Création utilisateurs banque (rattachement bank_id)
5.3 Gestion des utilisateurs (Admin)
CRUD agents : identité, zone/secteur, actif/inactif
Gestion rôles : Admin / Agent / Banque
Reset mot de passe / désactivation compte
5.4 Gestion débiteurs (PP/PM)
PP : nom, prénom, CIN/NNI, téléphones, adresses
PM : raison sociale, RC/NIF, siège, contacts, représentant légal
Fonctions :
Création / modification
Historique de mise à jour des coordonnées
5.5 Gestion des dossiers (cœur du système)
Chaque dossier contient au minimum 
Identité : référence Altis + référence banque, bank_id, statut, priorité, dates
Débiteur (PP/PM)
Dette : montants (principal, pénalités, frais, total), produit, ref contrat, date défaut
Affectation agent
Documents
Historique actions + promesses + paiements
Audit
Fonctions (Admin) :
Créer/importer dossier
Modifier dossier
Affecter / réaffecter agent
Changer statut
Clôturer dossier (motif obligatoire)

Fonctions (Agent) :
Voir liste dossiers affectés
Ouvrir dossier + ajouter actions + promesses + déclarations paiements
Fonctions (Banque) :
Voir liste dossiers de sa banque
Filtrer/chercher (statut, date, montant, débiteur)
Voir détail dossier (lecture)

5.6 Journal des actions terrain (Agent)
Action = (date/heure, type, résultat, compte-rendu, prochaine action + date, pièces)
Types : appel, visite, message, RDV, courrier…
Résultats : joignable, injoignable, refus, promesse, litige, payé, etc.
Critère d’acceptation
Toute action crée automatiquement une ligne d’historique horodatée + auteur.

5.7 Promesses & échéancier
Créer promesse : montant + date + mode + statut
Planifier plusieurs échéances (option MVP : simple liste)
Marquer promesse tenue / non tenue / replanifiée

5.8 Paiements
Déclaration paiement (agent) + justificatif
Validation/rejet (admin) avec motif
Calcul automatique du solde restant

5.9 Documents
Upload documents banque (contrat, relevés…) (admin)
Upload preuves terrain (agent)
Catégorie + visibilité :
Visible banque + admin
Visible admin seulement
Visible agent (selon règles)

5.10 Tableaux de bord & rapports
Admin
KPI : total dossiers, par statut, montants, taux recouvrement, performance agents
Exports (CSV/PDF) par banque, période, statut
Banque
KPI de sa banque uniquement : dossiers, montants, recouvrement
Exports
Agent
Mes dossiers : à traiter, en retard, promesses à relancer

6) Règles métiers (minimum)
Un dossier appartient à une seule banque
Un dossier a un débiteur (PP ou PM)
Un dossier peut avoir plusieurs actions, plusieurs documents, plusieurs paiements
Le statut Payé implique solde = 0
La clôture nécessite un motif obligatoire
Toute modification sensible est tracée (audit)

7) Écrans attendus (UI)
Admin
Dashboard global
Banques (liste + fiche)
Utilisateurs (agents + banque)
Dossiers (liste avancée + affectation)
Dossier détail (vue complète + validation paiement + clôture)
Rapports / exports
Agent
Dashboard agent (à traiter / promesses)
Mes dossiers
Dossier détail + ajouter action + upload preuve
Déclarer paiement / promesse
Banque
Dashboard banque
Dossiers de la banque
Dossier détail (lecture)
Rapport

8) Exigences non fonctionnelles
Sécurité : contrôle d’accès strict par rôle et bank_id, mots de passe hashés, protection contre injection/XSS
Traçabilité : audit log (création, modification, validation, suppression)
Performance : pagination, recherche, filtres
Disponibilité : sauvegardes BD + reprise
Confidentialité : séparation des données entre banques (obligatoire)

9) Contraintes techniques (à adapter)
Application web responsive
Base de données relationnelle
Upload fichiers sécurisé (type + taille max + nom unique)
Journalisation des erreurs

10) Livrables attendus
Documentation : cahier des charges + modèle données + règles métiers
Application web : admin + agent + banque
Base de données + scripts d’installation
Guide d’utilisation (admin/agent/banque)
Jeux de données de test
Procédure de déploiement

11) Recette & critères d’acceptation (exemples)
✅ Banque A ne voit que Banque A (liste/détail/export)
✅ Agent ne voit que ses dossiers affectés
✅ Admin peut créer banque, agent, dossier et affecter
✅ Ajout action terrain visible dans historiqu
✅ Paiement déclaré par agent, validé par admin, solde mis à jour
✅ Dossier clôturé avec motif obligatoire
✅ Exports fonctionnels (admin + banque)
