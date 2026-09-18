export interface PMURace {
  numReunion: number;
  numOrdre: number; // Race number (C1, C2)
  heureDepart: number;
  libelle: string;
  libelleCourt: string;
  distance: number;
  discipline: string;
  statut: string; // "PROGRAMMEE", "A_PARTIR", "ARRIVEE"
  corde?: string;
  penetrometre?: { valeurMesure?: string; intitule?: string; heureMesure?: string };
  montantPrix?: number;
  conditions?: string;
  typePiste?: string;
  parcours?: string;
  arriveeDefinitive?: boolean;
  ordreArrivee?: number[][];
  paris: any[];
}

export interface PMUReunion {
  numOfficiel: number;
  hippodrome: { libelleCourt: string; libelleLong: string };
  nature: string;
  courses: PMURace[];
}

export interface PMUProgramme {
  programme: {
    date: number;
    reunions: PMUReunion[];
  };
}

export interface PMUParticipant {
  numPmu: number;
  nom: string;
  age: number;
  sexe: string;
  race: string;
  entraineur: string;
  driver?: string;
  jockey?: string;
  driverChange?: boolean;
  musique: string;
  nombreCourses: number;
  nombreVictoires: number;
  nombrePlaces: number;
  nombrePlacesSecond?: number;
  nombrePlacesTroisieme?: number;
  gainsParticipant?: {
    gainsCarriere: number;
    gainsVictoires?: number;
    gainsPlace?: number;
    gainsAnneeEnCours?: number;
    gainsAnneePrecedente?: number;
  };
  deferre?: string;
  oeilleres?: string;
  reductionKilometrique?: number;
  placeCorde?: number;
  handicapPoids?: number;
  handicapValeur?: number;
  handicapDistance?: number;
  supplement?: number;
  avisEntraineur?: string;
  indicateurInedit?: boolean;
  allure?: string;
  dernierRapportDirect?: {
    rapport?: number;
    gains?: number;
    grossePrise?: boolean;
    nombreIndicateurTendance?: number;
  };
  dernierRapportReference?: {
    rapport?: number;
    gains?: number;
    grossePrise?: boolean;
    nombreIndicateurTendance?: number;
  };
}
