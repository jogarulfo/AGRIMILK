# AGRIMILK
Visualisation interactive des échanges extérieurs de produits laitiers français


1. Spécifications Générales (Layout & Dimensions)


Dimensions des données :

    Temps : Année, mois.

    Géographie : Pays UE (Union Européenne), pays tiers.

    Produit : Lait, fromage, etc.

    Indicateur : Exportation en volumes (tonnes).

2. Vue : Sélection d'un produit

Source : Image 1

Cette vue se concentre sur l'analyse d'un produit spécifique (ex: le lait) sélectionné dans un menu latéral.
A. Répartition (Principaux pays)

    Visualisation : Diagramme circulaire (Camembert) pour une année "XXXX".

    Segmentation par région :

        Amérique (Rouge)

        Asie (Bleu)

        UE (Vert)

    Détail (Drill-down) : Un second graphique détaille spécifiquement la part des "Pays de l'UE" si le segment UE est sélectionné/mis en avant.

B. Évolution temporelle

    Visualisation : Graphique linéaire (Courbes).

    Axe Y : Exportations.

    Axe X : Temps (t).

    Séries de données (Légende) :

        Tous pays (Noir)

        Amérique (Rouge)

        Europe / UE (Bleu)

        Asie (Vert)

3. Vue : Carte & Filtres Interactifs

Source : Image 2

Cette vue permet une exploration géographique dynamique basée sur des critères temporels et produits.
A. Filtres (Menu haut)

Trois sélecteurs à défilement (scroll) :

    Année : (ex: 2020, 2019, 2018...)

    Produit : (ex: Lait, Fromage...)

    Mois : (ex: Janvier, Février...)

Exemple de sélection noté : "Lait, Janvier 2018"
B. Visualisation Cartographique

    Type : Carte choroplèthe (carte thermique).

    Logique de visualisation :

        "Couleur de chaque pays + ou - forte selon son poids dans les échanges avec la France selon le filtre choisi."

    Représentation : Les hachures/couleurs rouges sur la carte indiquent l'intensité des échanges.

4. Vue : Sélection d'un pays

Source : Image 3 (Bas de page)

Cette vue détaille les échanges bilatéraux entre la France et un pays spécifique choisi sur la carte.
A. Interaction

    Action : Sélection d'un pays sur la carte (clic sur un point/pays).

    Résultat : Affichage du panneau "Opérations" à droite.

B. Panneau de Détails (Opérations)

1. Répartition des principaux produits échangés

    Contexte : Année [...] pour le pays sélectionné avec la France.

    Visualisation : Diagramme circulaire.

    Catégories : Lait, Yaourt, Fromage.

2. Pourcentage des échanges avec le pays [-]

    Visualisation : Graphique d'évolution (Lignes).

    Axe Y : Pourcentage (10%, 20%, 30%).

    Axe X : Temps (2000, 2010, 2020).

    Séries de données :

        Tous produits (Rouge)

        Lait (Bleu)

        Fromage (Vert)