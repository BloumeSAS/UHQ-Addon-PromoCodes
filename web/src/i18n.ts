import { useCallback } from 'react';
import { useAddon } from './context';

type Dict = Record<string, string>;

const fr: Dict = {
  'ui.retry': 'Réessayer', 'ui.cancel': 'Annuler', 'ui.confirm': 'Confirmer', 'ui.close': 'Fermer', 'ui.prev': 'Précédent', 'ui.next': 'Suivant',
  'ui.pageOf': 'Page {page} / {pages} — {total} résultats', 'ui.copy': 'Copier', 'ui.copied': 'Copié', 'ui.refresh': 'Actualiser', 'ui.loading': 'Chargement…',

  noToken: 'Connexion requise', noTokenText: 'Ouvrez cette page depuis le panel pour gérer vos codes promo.',
  noAdmin: 'Accès réservé aux administrateurs', noAdminText: 'La gestion des codes promo n’est accessible qu’aux administrateurs du panel.',

  // Client
  myCodes: 'Codes promo', myCodesSub: 'Appliquez un code cadeau sur votre solde et retrouvez vos codes déjà utilisés.',
  walletDown: 'L’addon Wallet est indisponible : les codes cadeau ne peuvent pas être appliqués pour le moment.',
  redeemTitle: 'Appliquer un code cadeau', redeemHelp: 'Saisissez votre code : le montant offert est ajouté immédiatement à votre solde.',
  codePlaceholder: 'Votre code', apply: 'Appliquer', applied: 'Code appliqué',
  credited: '{v} ajoutés à votre solde avec le code {code}.',
  howWallet: 'Bonus de recharge', howWalletText: 'Vous avez un code de bonus ? Saisissez-le sur la page « Mon solde » au moment de recharger.',
  howShop: 'Réduction boutique', howShopText: 'Un code de réduction se saisit dans votre panier, avant de payer votre commande.',
  history: 'Codes utilisés', noHistory: 'Aucun code utilisé', noHistoryText: 'Les codes que vous appliquez apparaîtront ici.',
  code: 'Code', usedFor: 'Utilisé pour', benefit: 'Avantage', date: 'Date',
  'ctx.redeem': 'Solde', 'ctx.topup': 'Recharge', 'ctx.shop': 'Boutique',
  'reason.unknown': 'Code inconnu.', 'reason.inactive': 'Ce code n’est plus actif.', 'reason.not_started': 'Ce code n’est pas encore valable.',
  'reason.expired': 'Ce code a expiré.', 'reason.exhausted': 'Ce code a atteint son nombre maximum d’utilisations.', 'reason.user_limit': 'Vous avez déjà utilisé ce code.',
  'reason.min_amount': 'Le montant minimum n’est pas atteint.', 'reason.max_amount': 'Le montant dépasse le maximum autorisé pour ce code.',
  'reason.not_eligible_user': 'Ce code n’est pas disponible pour votre compte.', 'reason.not_eligible_product': 'Ce code ne s’applique à aucun article de votre panier.',
  'reason.min_items': 'Votre panier ne contient pas assez d’articles pour ce code.', 'reason.first_order_only': 'Ce code est réservé à une première commande.',
  'reason.payment_method': 'Ce code n’est pas valable avec ce moyen de paiement.', 'reason.wrong_context': 'Ce code ne s’applique pas ici.',
  'reason.nothing_to_apply': 'Ce code n’offre aucun avantage sur ce montant.', 'reason.WALLET_UNAVAILABLE': 'Le portefeuille est indisponible, réessayez dans un instant.',
  'reason.Trop de tentatives : réessayez dans quelques minutes.': 'Trop de tentatives : réessayez dans quelques minutes.',

  // Admin
  promoManagement: 'Codes promo', promoManagementSub: 'Codes cadeau, bonus de recharge et réductions boutique, entièrement personnalisables.',
  'stat.codes': 'Codes', 'stat.activeCount': '{n} actif(s)', 'stat.uses': 'Utilisations', 'stat.usesMonth': '{n} ce mois-ci',
  'stat.credit': 'Crédit offert', 'stat.creditSub': 'codes cadeau', 'stat.bonus': 'Bonus de recharge', 'stat.bonusSub': 'sur les recharges', 'stat.discount': 'Réductions', 'stat.discountSub': 'sur la boutique',
  'tab.codes': 'Codes', 'tab.uses': 'Utilisations',
  searchCodes: 'Rechercher un code ou un libellé…', type: 'Type', status: 'Statut', filter: 'Filtre', 'filter.all': 'Tous',
  'status.all': 'Tous les statuts', 'status.active': 'Actifs', 'status.inactive': 'Désactivés', 'status.expired': 'Expirés', 'status.exhausted': 'Épuisés',
  'kind.credit': 'Code cadeau (crédit)', 'kind.credit.short': 'Cadeau', 'kind.credit.hint': 'Ajoute un montant au solde Wallet du client quand il le saisit.',
  'kind.topup_bonus': 'Bonus de recharge', 'kind.topup_bonus.short': 'Bonus', 'kind.topup_bonus.hint': 'Ajoute un bonus (%) quand le client recharge son solde.',
  'kind.discount': 'Réduction boutique', 'kind.discount.short': 'Réduction', 'kind.discount.hint': 'Réduit le total d’une commande dans la boutique (Orders).',
  generate: 'Générer en lot', newCode: 'Nouveau code', editCode: 'Modifier le code', create: 'Créer', save: 'Enregistrer', saved: 'Enregistré',
  value: 'Valeur', uses: 'Utilisations', validity: 'Validité', active: 'Actif', actions: 'Actions', edit: 'Modifier', duplicate: 'Dupliquer', delete: 'Supprimer',
  confirmDelete: 'Supprimer le code {code} ? L’historique de ses utilisations est conservé.',
  noExpiry: 'Sans limite', until: 'Jusqu’au {d}', expiredOn: 'Expiré le {d}', capShort: 'max',
  noResults: 'Aucun résultat', noResultsText: 'Aucun code ne correspond à ces filtres.',
  emptyTitle: 'Aucun code promo', emptyText: 'Créez un code cadeau, un bonus de recharge ou une réduction pour la boutique.', createFirst: 'Créer mon premier code',
  'sec.type': 'Type de code', 'sec.general': 'Informations', 'sec.value': 'Avantage', 'sec.limits': 'Validité et limites', 'sec.conditions': 'Conditions', 'sec.audience': 'Public visé', 'sec.notes': 'Note interne',
  kindLocked: 'Le type d’un code existant ne peut pas être modifié.',
  codeHint: 'Lettres, chiffres, - et _ (3 à 40). Le client peut le saisir en minuscules.', random: 'Aléatoire',
  label: 'Libellé', labelHint: 'Affiché au client quand le code est appliqué.', labelPlaceholder: 'Offre de bienvenue',
  description: 'Description', descriptionHint: 'Optionnelle, visible dans l’administration.',
  activeHint: 'Un code désactivé est refusé immédiatement.',
  creditAmount: 'Montant offert', creditAmountHint: 'Crédité sur le solde du client.',
  percent: 'Pourcentage (%)', percentHintDiscount: 'Réduction sur les articles concernés.', percentHintBonus: 'Bonus calculé sur le montant de la recharge.',
  fixedAmount: 'Montant fixe', fixedHint: 'S’ajoute au pourcentage. 0 = aucun.', maxEffect: 'Plafond de l’avantage', maxEffectHint: 'Le bonus / la réduction ne dépassera jamais ce montant.',
  startsAt: 'Valable à partir du', expiresAt: 'Expire le', emptyNow: 'Vide = tout de suite.', emptyNever: 'Vide = jamais.', emptyUnlimited: 'Vide = illimité.', emptyNone: 'Vide = aucune condition.',
  maxUses: 'Utilisations totales', maxUsesPerUser: 'Utilisations par client', perUserCreditHint: 'Un code cadeau est limité à 1 utilisation par client par défaut.',
  cartAmount: 'du panier', topupAmount: 'de la recharge', minAmount: 'Montant minimum {what}', maxAmount: 'Montant maximum {what}', minItems: 'Articles minimum dans le panier',
  onlyProducts: 'Uniquement ces produits', onlyProductsHint: 'Aucun coché = tous les produits.', excludeProducts: 'Produits exclus', noProducts: 'Aucun produit dans la boutique.', inactiveProduct: 'inactif',
  idsHint: 'Identifiants de produit, un par ligne (la liste se charge automatiquement si l’addon Orders est actif).',
  paymentMethods: 'Moyens de paiement autorisés', paymentMethodsHint: 'Aucun coché = tous.',
  'pay.wallet': 'Solde Wallet', 'pay.stripe': 'Carte bancaire', 'pay.nowpayments': 'Crypto', 'pay.paypal': 'PayPal',
  firstOrder: 'Première commande uniquement', firstOrderHint: 'Refusé si le client a déjà une commande payée.',
  topupNote: 'Le bonus s’applique aux recharges du solde (addon Wallet avec l’addon Orders).',
  audienceHint: 'Laissez vide pour que tout le monde puisse utiliser le code ; sinon seuls les comptes listés (ou l’une de ces conditions) y ont droit.',
  emails: 'Adresses e-mail', emailsHint: 'Une par ligne.', emailDomains: 'Domaines d’e-mail', emailDomainsHint: 'Ex. @entreprise.fr', userIds: 'Identifiants de comptes', userIdsHint: 'Identifiants du panel, un par ligne.',
  notesHint: 'Jamais montrée au client (campagne, partenaire…).',
  'err.code': 'Code invalide (3 à 40 caractères : A-Z, 0-9, - et _).', 'err.fixedPositive': 'Indiquez un montant supérieur à 0.', 'err.valueRequired': 'Indiquez un pourcentage et/ou un montant fixe.',
  'err.percent': 'Le pourcentage doit être compris entre 0 et 100.', 'err.dates': 'La date de fin doit suivre la date de début.', 'err.minMax': 'Le maximum doit dépasser le minimum.',
  generateTitle: 'Générer des codes en lot', generateHelp: 'Crée des codes uniques à usage unique (ex. cartes cadeau). Le libellé reprend le préfixe.',
  count: 'Nombre de codes', countHint: '500 maximum.', prefix: 'Préfixe', prefixHint: 'Ex. GIFT → GIFT-AB12CD34.', length: 'Longueur du code',
  generated: '{n} code(s) généré(s) — copiez-les maintenant ou téléchargez le CSV.', copyAll: 'Tout copier', downloadCsv: 'Télécharger le CSV',
  searchUses: 'Rechercher (code, client, référence)…', exportCsv: 'Exporter en CSV', noUses: 'Aucune utilisation', noUsesText: 'Les utilisations de codes apparaîtront ici.',
  customer: 'Client', reference: 'Référence', released: 'annulée',
};

const en: Dict = {
  'ui.retry': 'Retry', 'ui.cancel': 'Cancel', 'ui.confirm': 'Confirm', 'ui.close': 'Close', 'ui.prev': 'Previous', 'ui.next': 'Next',
  'ui.pageOf': 'Page {page} / {pages} — {total} results', 'ui.copy': 'Copy', 'ui.copied': 'Copied', 'ui.refresh': 'Refresh', 'ui.loading': 'Loading…',

  noToken: 'Sign-in required', noTokenText: 'Open this page from the panel to manage your promo codes.',
  noAdmin: 'Administrators only', noAdminText: 'Promo code management is only available to panel administrators.',

  myCodes: 'Promo codes', myCodesSub: 'Apply a gift code to your balance and find the codes you already used.',
  walletDown: 'The Wallet addon is unavailable: gift codes cannot be applied right now.',
  redeemTitle: 'Apply a gift code', redeemHelp: 'Enter your code: the offered amount is added to your balance immediately.',
  codePlaceholder: 'Your code', apply: 'Apply', applied: 'Code applied',
  credited: '{v} added to your balance with code {code}.',
  howWallet: 'Top-up bonus', howWalletText: 'Got a bonus code? Enter it on the “My balance” page when you top up.',
  howShop: 'Shop discount', howShopText: 'A discount code is entered in your cart, before paying your order.',
  history: 'Codes used', noHistory: 'No code used yet', noHistoryText: 'Codes you apply will appear here.',
  code: 'Code', usedFor: 'Used for', benefit: 'Benefit', date: 'Date',
  'ctx.redeem': 'Balance', 'ctx.topup': 'Top-up', 'ctx.shop': 'Shop',
  'reason.unknown': 'Unknown code.', 'reason.inactive': 'This code is no longer active.', 'reason.not_started': 'This code is not valid yet.',
  'reason.expired': 'This code has expired.', 'reason.exhausted': 'This code has reached its maximum number of uses.', 'reason.user_limit': 'You have already used this code.',
  'reason.min_amount': 'The minimum amount is not reached.', 'reason.max_amount': 'The amount exceeds the maximum allowed for this code.',
  'reason.not_eligible_user': 'This code is not available for your account.', 'reason.not_eligible_product': 'This code applies to no item in your cart.',
  'reason.min_items': 'Your cart does not contain enough items for this code.', 'reason.first_order_only': 'This code is reserved for a first order.',
  'reason.payment_method': 'This code is not valid with this payment method.', 'reason.wrong_context': 'This code does not apply here.',
  'reason.nothing_to_apply': 'This code gives no benefit on this amount.', 'reason.WALLET_UNAVAILABLE': 'The wallet is unavailable, try again in a moment.',
  'reason.Trop de tentatives : réessayez dans quelques minutes.': 'Too many attempts: try again in a few minutes.',

  promoManagement: 'Promo codes', promoManagementSub: 'Gift codes, top-up bonuses and shop discounts, fully customisable.',
  'stat.codes': 'Codes', 'stat.activeCount': '{n} active', 'stat.uses': 'Uses', 'stat.usesMonth': '{n} this month',
  'stat.credit': 'Credit given', 'stat.creditSub': 'gift codes', 'stat.bonus': 'Top-up bonuses', 'stat.bonusSub': 'on top-ups', 'stat.discount': 'Discounts', 'stat.discountSub': 'on the shop',
  'tab.codes': 'Codes', 'tab.uses': 'Uses',
  searchCodes: 'Search a code or label…', type: 'Type', status: 'Status', filter: 'Filter', 'filter.all': 'All',
  'status.all': 'All statuses', 'status.active': 'Active', 'status.inactive': 'Disabled', 'status.expired': 'Expired', 'status.exhausted': 'Exhausted',
  'kind.credit': 'Gift code (credit)', 'kind.credit.short': 'Gift', 'kind.credit.hint': 'Adds an amount to the customer’s Wallet balance when entered.',
  'kind.topup_bonus': 'Top-up bonus', 'kind.topup_bonus.short': 'Bonus', 'kind.topup_bonus.hint': 'Adds a bonus (%) when the customer tops up their balance.',
  'kind.discount': 'Shop discount', 'kind.discount.short': 'Discount', 'kind.discount.hint': 'Reduces an order total in the shop (Orders).',
  generate: 'Bulk generate', newCode: 'New code', editCode: 'Edit code', create: 'Create', save: 'Save', saved: 'Saved',
  value: 'Value', uses: 'Uses', validity: 'Validity', active: 'Active', actions: 'Actions', edit: 'Edit', duplicate: 'Duplicate', delete: 'Delete',
  confirmDelete: 'Delete code {code}? The history of its uses is kept.',
  noExpiry: 'No limit', until: 'Until {d}', expiredOn: 'Expired {d}', capShort: 'max',
  noResults: 'No results', noResultsText: 'No code matches these filters.',
  emptyTitle: 'No promo code', emptyText: 'Create a gift code, a top-up bonus or a shop discount.', createFirst: 'Create my first code',
  'sec.type': 'Code type', 'sec.general': 'Information', 'sec.value': 'Benefit', 'sec.limits': 'Validity and limits', 'sec.conditions': 'Conditions', 'sec.audience': 'Target audience', 'sec.notes': 'Internal note',
  kindLocked: 'The type of an existing code cannot be changed.',
  codeHint: 'Letters, digits, - and _ (3 to 40). Customers can type it in lowercase.', random: 'Random',
  label: 'Label', labelHint: 'Shown to the customer when the code is applied.', labelPlaceholder: 'Welcome offer',
  description: 'Description', descriptionHint: 'Optional, visible in administration.',
  activeHint: 'A disabled code is refused immediately.',
  creditAmount: 'Amount offered', creditAmountHint: 'Credited to the customer’s balance.',
  percent: 'Percentage (%)', percentHintDiscount: 'Discount on the targeted items.', percentHintBonus: 'Bonus computed on the top-up amount.',
  fixedAmount: 'Fixed amount', fixedHint: 'Added to the percentage. 0 = none.', maxEffect: 'Benefit cap', maxEffectHint: 'The bonus / discount will never exceed this amount.',
  startsAt: 'Valid from', expiresAt: 'Expires on', emptyNow: 'Empty = right now.', emptyNever: 'Empty = never.', emptyUnlimited: 'Empty = unlimited.', emptyNone: 'Empty = no condition.',
  maxUses: 'Total uses', maxUsesPerUser: 'Uses per customer', perUserCreditHint: 'A gift code is limited to 1 use per customer by default.',
  cartAmount: 'of the cart', topupAmount: 'of the top-up', minAmount: 'Minimum amount {what}', maxAmount: 'Maximum amount {what}', minItems: 'Minimum items in the cart',
  onlyProducts: 'Only these products', onlyProductsHint: 'None ticked = all products.', excludeProducts: 'Excluded products', noProducts: 'No product in the shop.', inactiveProduct: 'inactive',
  idsHint: 'Product identifiers, one per line (the list loads automatically when the Orders addon is active).',
  paymentMethods: 'Allowed payment methods', paymentMethodsHint: 'None ticked = all.',
  'pay.wallet': 'Wallet balance', 'pay.stripe': 'Bank card', 'pay.nowpayments': 'Crypto', 'pay.paypal': 'PayPal',
  firstOrder: 'First order only', firstOrderHint: 'Refused if the customer already has a paid order.',
  topupNote: 'The bonus applies to balance top-ups (Wallet addon together with the Orders addon).',
  audienceHint: 'Leave empty so everyone can use the code; otherwise only the listed accounts (or matching any of these rules) are eligible.',
  emails: 'E-mail addresses', emailsHint: 'One per line.', emailDomains: 'E-mail domains', emailDomainsHint: 'E.g. @company.com', userIds: 'Account identifiers', userIdsHint: 'Panel identifiers, one per line.',
  notesHint: 'Never shown to the customer (campaign, partner…).',
  'err.code': 'Invalid code (3 to 40 characters: A-Z, 0-9, - and _).', 'err.fixedPositive': 'Enter an amount above 0.', 'err.valueRequired': 'Enter a percentage and/or a fixed amount.',
  'err.percent': 'The percentage must be between 0 and 100.', 'err.dates': 'The end date must be after the start date.', 'err.minMax': 'The maximum must exceed the minimum.',
  generateTitle: 'Generate codes in bulk', generateHelp: 'Creates unique single-use codes (e.g. gift cards). The label uses the prefix.',
  count: 'Number of codes', countHint: '500 max.', prefix: 'Prefix', prefixHint: 'E.g. GIFT → GIFT-AB12CD34.', length: 'Code length',
  generated: '{n} code(s) generated — copy them now or download the CSV.', copyAll: 'Copy all', downloadCsv: 'Download CSV',
  searchUses: 'Search (code, customer, reference)…', exportCsv: 'Export CSV', noUses: 'No use yet', noUsesText: 'Code uses will appear here.',
  customer: 'Customer', reference: 'Reference', released: 'released',
};

const DICT: Record<'fr' | 'en', Dict> = { fr, en };

export type Params = Record<string, string | number | null | undefined>;

export function translate(lang: 'fr' | 'en', key: string, params: Params = {}): string {
  const tpl = DICT[lang][key] ?? DICT.fr[key] ?? key;
  return tpl.replace(/\{(\w+)\}/g, (_m, name: string) => (params[name] === undefined || params[name] === null ? '' : String(params[name])));
}

export function useT() {
  const { lang } = useAddon();
  return useCallback((key: string, params?: Params) => translate(lang, key, params), [lang]);
}
