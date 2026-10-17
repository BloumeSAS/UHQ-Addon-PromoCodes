# UHQ Addon — Promo Codes

Codes promo **entièrement personnalisables** pour [UHQ Panel OS](https://github.com/BloumeSAS/UHQ-Panel-OS) :

- 🎁 **Codes cadeau** (crédit) : ajoutent un montant au solde [Wallet](https://github.com/BloumeSAS/UHQ-Addon-Wallet) du client.
- 💳 **Bonus de recharge** : % et/ou montant fixe offert quand le client recharge son solde (Wallet + [Orders](https://github.com/BloumeSAS/UHQ-Addon-Orders)).
- 🛒 **Réductions boutique** : % et/ou montant fixe sur une commande Orders.
- Conditions : dates, utilisations totales / par client, montant min/max, nombre d'articles, produits ciblés ou exclus, moyens de paiement, première commande, public visé (e-mails, domaines, comptes), plafond d'avantage.
- Génération de codes **en lot** (cartes cadeau à usage unique), historique des utilisations, export CSV.

Nécessite l'addon **Wallet**. Fonctionne embarqué dans le panel (Extensions → Activer) ou en déploiement séparé (voir `docker-compose.yml`).

## Variables d'environnement
| Variable | Défaut | Rôle |
|---|---|---|
| `PORT` | `3105` | Port d'écoute |
| `PANEL_URL` | `http://localhost:8000` | URL du panel (vérification des jetons) |
| `PANEL_API_KEY` | — | Clé API du panel (appels internes, sauvegarde) |
| `WALLET_URL` | — | URL de l'addon Wallet |
| `DB_PATH` | `./promocodes-data.json` | Fichier de données |

Licence MIT — © Bloume SAS
