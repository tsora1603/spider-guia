/*
 * Links editoriais curados.
 * Adicione grupos ou destinos sem alterar URLs, labels ou associações existentes.
 * Fontes documentais ficam em DATA.fontes.
 *
 * Campos opcionais para edições legais:
 * - brazilianEdition: "Nome da edição brasileira";
 * - stores: [{ label, url }];
 * - libraries: [{ label, url }].
 */

(() => {
  if (window.LINKS_ENABLED === false) {
    window.getEditorialLinks = () => [];
    return;
  }


window.EDITORIAL_LINKS = [
  {
    "id": "leitura-4",
    "readingGroup": 4,
    "title": "Marvel Super Heroes Secret Wars (Guerras Secretas) #8 (dez/1984)",
    "itemIds": [
      255
    ],
    "context": "A Amazing #252 (mai/1984) saiu antes e já mostra Peter de traje preto, sem explicar de onde veio. A Secret Wars #8 mostra o momento em que ele recebe o traje.",
    "links": [
      {
        "label": "Guerras Secretas",
        "url": "https://www.mediafire.com/file/i2yt34flnmkp02j/198412_Marvel_Super-Herois_Guerras_Secretas_008.cbr/file"
      }
    ]
  },
  {
    "id": "leitura-5",
    "readingGroup": 5,
    "title": "Marvel Team-Up #141–150 e annual #7; Peter Parker, The Spectacular Spider-Man #90–100; AMS annual #20",
    "itemIds": [
      256,
      257,
      258,
      259
    ],
    "context": "Amplia a Saga do Traje Negro. O essencial já está na Amazing: a descoberta de que o traje é vivo, na #258.",
    "links": [
      {
        "label": "Marvel Team Up",
        "url": "https://hqs-soquadrinhos.blogspot.com/2011/08/marvel-team-up-1972.html"
      },
      {
        "label": "AMS Annual #20",
        "url": "https://drive.google.com/file/d/1iftvFekVFgcrRueCT5jZX4NVa4nRTqxm/view?usp=drive_link"
      }
    ]
  },
  {
    "id": "leitura-6",
    "readingGroup": 6,
    "title": "Web of Spider-Man #1 (1985)",
    "itemIds": [
      272
    ],
    "context": "A Saga do Traje Negro fecha nesta edição. A #264 ainda mostra Peter com um traje preto comum, não com o simbionte.",
    "links": [
      {
        "label": "Web of Spider",
        "url": "https://www.mediafire.com/file/8i456yc0b52tc5l/"
      }
    ]
  },
  {
    "id": "leitura-7",
    "readingGroup": 7,
    "title": "Peter Parker, The Spectacular Spider-Man #107–110 (A Morte de Jean DeWolff)",
    "itemIds": [
      278
    ],
    "context": "Peter e o Demolidor caçam o assassino de uma amiga policial. Mostra os limites morais de Peter. A #37 da Amazing (2018) ressuscita o Sin-Eater, vilão deste arco.",
    "links": [
      {
        "label": "Arco completo (GoFile)",
        "url": "https://gofile.io/d/llaPQfHo%20jean%20dewolff"
      }
    ]
  },
  {
    "id": "leitura-8",
    "readingGroup": 8,
    "title": "The Amazing Spider-Man Annual #21 (1987), o casamento",
    "itemIds": [
      303
    ],
    "context": "O casamento acontece no Annual, fora da contagem. Sem ele, a #293 em diante mostra o casal já casado, sem a cerimônia. É este casamento que One More Day apaga (#544–545).",
    "links": [
      {
        "label": "AMS Annual #21",
        "url": "https://www.mediafire.com/download/83knz3z28wrv5gn/O+Espantoso+Homem-Aranha+Anual+21+%28Lemuria%29.cbr"
      }
    ]
  },
  {
    "id": "leitura-10",
    "readingGroup": 10,
    "title": "A Última Caçada de Kraven (4 edições fora da Amazing)",
    "itemIds": [
      305
    ],
    "context": "Só as duas edições da Amazing deixam o arco cortado. Mostra do que Peter é feito. Hunted (Amazing 2018, #16–23) remete a esta história.",
    "links": [
      {
        "label": "Arco completo (SoQuadrinhos)",
        "url": "https://hqs-soquadrinhos.blogspot.com/2011/08/homem-aranha-ultima-cacada-de-kraven.html"
      }
    ]
  },
  {
    "id": "leitura-11",
    "readingGroup": 11,
    "title": "Maximum Carnage (1993)",
    "itemIds": [
      391
    ],
    "context": "Só 3 dos 14 capítulos estão na Amazing (#378–380). Quer o arco completo? Siga a ordem da coluna ao lado. Prefere a linha enxuta? Pule. Carnificina já estreou nas #361–363, dentro da contagem. Mas as três edições ficam com buracos de enredo.",
    "links": [
      {
        "label": "Arco completo (GoFile)",
        "url": "https://gofile.io/d/XyblnkJo%20carnificina%20max%20anos%2090"
      }
    ]
  },
  {
    "id": "leitura-13",
    "readingGroup": 13,
    "title": "The Gathering of Five / The Final Chapter (1998)",
    "itemIds": [
      605
    ],
    "context": "A #441 não fecha a história. O desfecho do arco, com Peter anunciando que larga o manto, está nessas três edições. Só depois começa o volume de 1999 (#442). A verdadeira Tia May reaparece aqui (aba 'Marcos e arcos').",
    "links": [
      {
        "label": "Arco completo (SoQuadrinhos)",
        "url": "https://hqs-soquadrinhos.blogspot.com/2011/08/homem-aranha-reuniao-dos-cinco-1998.html"
      }
    ]
  },
  {
    "id": "leitura-14",
    "readingGroup": 14,
    "title": "The Other (2005–06)",
    "itemIds": [
      690
    ],
    "context": "Peter 'morre' e volta com habilidades novas (Peter David, Reginald Hudlin e Straczynski). A linha 'The Other' da aba 'Marcos e arcos' lista só a Marvel Knights. A fonte conferida inclui também Friendly Neighborhood (2005) #1–4.",
    "links": [
      {
        "label": "Arco completo (Mega)",
        "url": "https://mega.nz/folder/iIo2WJTS"
      }
    ]
  },
  {
    "id": "leitura-15",
    "readingGroup": 15,
    "title": "Civil War (Guerra Civil) #1–2 (2006)",
    "itemIds": [
      698
    ],
    "context": "Na Civil War #2, Peter revela a identidade em rede nacional. Sem ela, a #532 já começa com ele desmascarado.",
    "links": [
      {
        "label": "Arco completo (SoQuadrinhos)",
        "url": "https://hqs-soquadrinhos.blogspot.com/2011/08/guerra-civil-2006.html"
      }
    ]
  },
  {
    "id": "leitura-16",
    "readingGroup": 16,
    "title": "Civil War #3–7 (2006–07)",
    "itemIds": [
      701
    ],
    "context": "Peter muda de lado e luta ao lado do Capitão América. Isso já aparece na Amazing (#532–538, 'Civil War: Amazing Spider-Man'). Um resumo do evento dá o contexto. Leia as edições só se quiser o evento todo. O peso é recomendação deste guia.",
    "links": [
      {
        "label": "Arco completo (SoQuadrinhos)",
        "url": "https://hqs-soquadrinhos.blogspot.com/2011/08/guerra-civil-2006.html"
      }
    ]
  },
  {
    "id": "leitura-17",
    "readingGroup": 17,
    "title": "Back in Black (Homem-Aranha: De Volta ao Negro): Friendly Neighborhood Spider-Man #17–23 e Annual #1; Sensational Spider-Man (2006) #35–40 e Annual #1",
    "itemIds": [
      707,
      708,
      710,
      711,
      713,
      714,
      716,
      717,
      718,
      719,
      720,
      722,
      723,
      724,
      725
    ],
    "context": "Complementa a Amazing #539–543: Peter, de traje preto, caça quem atirou na Tia May (na #538). A história principal está na Amazing. Leia estas só se quiser o arco inteiro.",
    "links": [
      {
        "label": "Arco completo (Mega)",
        "url": "https://mega.nz/folder/iIo2WJTS"
      }
    ]
  },
  {
    "id": "leitura-18",
    "readingGroup": 18,
    "title": "One More Day (Um Dia a Mais)",
    "itemIds": [
      728
    ],
    "context": "O acordo com Mephisto, que apaga o casamento, passa por essas duas edições. Abre a fase Brand New Day (#546 em diante).",
    "links": [
      {
        "label": "Arco completo (Mega)",
        "url": "https://mega.nz/folder/iIo2WJTS"
      }
    ]
  },
  {
    "id": "leitura-19",
    "readingGroup": 19,
    "title": "Ultimate Spider-Man (2024) #1",
    "itemIds": [
      730
    ],
    "context": "Desvio opcional: em outro universo, o casamento de Peter e MJ é restaurado. Fica fora da continuidade principal. Não desfaz One More Day.",
    "links": [
      {
        "label": "HQ completa (SoQuadrinhos)",
        "url": "https://hqs-soquadrinhos.blogspot.com/2024/01/ultimate-homem-aranha-2024.html"
      }
    ]
  },
  {
    "id": "leitura-21",
    "readingGroup": 21,
    "title": "Spider-Island: Deadly Foes #1 e Venom (2011) #6–8. Também há as minisséries Spider-Island: Cloak & Dagger, Deadly Hands of Kung Fu e The Amazing Spider-Girl",
    "itemIds": [
      855,
      856,
      859,
      861,
      864,
      865,
      866
    ],
    "context": "O núcleo (#666–673) está na contagem e se entende sem tie-ins. Leia estes só para ampliar o evento.",
    "links": [
      {
        "label": "Arco completo + Minisséries (Mega)",
        "url": "https://mega.nz/folder/iIo2WJTS"
      }
    ]
  },
  {
    "id": "leitura-22",
    "readingGroup": 22,
    "title": "Prelúdio de Spider-Verse, parte 1: Superior Spider-Man #32–33, Edge of Spider-Verse #1–5 e Spider-Man 2099 (2014) #5",
    "itemIds": [
      933,
      934,
      935,
      936,
      937,
      939,
      940
    ],
    "context": "As 7 edições originalmente listadas (Superior #32–33 + Edge #1–5) estão confirmadas, mas a Marvel também inclui Spider-Man 2099 #5 na sequência do prelúdio. Isso corrige o antigo ≈7 para 8 edições fora da linha. Superior #32–33 continuam sendo #732–733 na numeração histórica; o ponto de leitura deste bloco é posterior à #739.",
    "links": [
      {
        "label": "Arco completo (SoQuadrinhos)",
        "url": "https://hqs-soquadrinhos.blogspot.com/2015/10/no-limiar-do-universo-aranha-2014.html"
      }
    ]
  },
  {
    "id": "leitura-23",
    "readingGroup": 23,
    "title": "Spider-Verse, início do evento após a Amazing (2014) #8: Spider-Verse Team-Up #1 e Spider-Verse #1–2; tie-ins restantes são opcionais.",
    "itemIds": [
      943
    ],
    "context": "A antiga conta ≈5 (+11) misturava o encerramento do prelúdio com o começo do evento. A Marvel inicia o evento propriamente dito na #9; fora da contagem, o bloco inicial tem Team-Up #1 + Spider-Verse #1–2. Os outros 12 tie-ins são classificados como opcionais por HTLC/Marvel.",
    "links": [
      {
        "label": "Arco completo (SoQuadrinhos)",
        "url": "https://hqs-soquadrinhos.blogspot.com/2015/10/no-limiar-do-universo-aranha-2014.html"
      }
    ]
  },
  {
    "id": "leitura-24",
    "readingGroup": 24,
    "title": "Secret Wars (2015) #1–9",
    "itemIds": [
      953
    ],
    "context": "A Marvel posiciona Secret Wars entre o fim do volume de 2014 e Renew Your Vows. Um resumo do evento basta. O peso é recomendação deste guia.",
    "links": [
      {
        "label": "Arco completo (SoQuadrinhos)",
        "url": "https://hqs-soquadrinhos.blogspot.com/2015/05/guerras-secretas-2015.html"
      }
    ]
  },
  {
    "id": "leitura-25",
    "readingGroup": 25,
    "title": "The Clone Conspiracy #1–5 e Omega #1 (minissérie, fora da contagem)",
    "itemIds": [
      978,
      984
    ],
    "context": "As #20–24 da Amazing (2015) estão na contagem e acompanham a minissérie. A Marvel descreve assim, então a minissérie é o miolo do arco.",
    "links": [
      {
        "label": "Só Quadrinhos: Amazing (2015) #20–24",
        "url": "https://hqs-soquadrinhos.blogspot.com/2017/01/o-espantoso-homem-aranha-2016.html"
      },
      {
        "label": "HQ Now: Omega #1",
        "url": "https://www.hq-now.com/hq-reader/25231/a-conspira-o-dos-clones/chapter/6/page/1"
      }
    ]
  },
  {
    "id": "leitura-26",
    "readingGroup": 26,
    "title": "Amazing Spider-Man (2018) #16.HU, #18.HU, #19.HU e #20.HU (tie-ins pontuados de Hunted)",
    "itemIds": [
      1021,
      1026,
      1028,
      1030
    ],
    "context": "A história principal corre na Amazing; as .HU são tie-ins complementares e não entram na numeração histórica. A fonte de Hunted confirma as quatro edições pontuadas usadas neste guia.",
    "links": [
      {
        "label": "Link do drive com os capítulos",
        "url": "https://drive.google.com/drive/folders/1Nqbm2J-yx12u8OknZjtIFwkMr75yVtoM?usp=drive_link"
      }
    ]
  },
  {
    "id": "leitura-27",
    "readingGroup": 27,
    "title": "Spider-Geddon #0–5 (2018) e tie-ins",
    "itemIds": [
      1022
    ],
    "context": "A Amazing (2018) NÃO depende de Spider-Geddon para acompanhar a trama principal. A minissérie e os tie-ins seguem a saga dos Aranhas como material paralelo; a posição exata em relação a cada número da Amazing fica pendente.",
    "links": [
      {
        "label": "Arco completo (SoQuadrinhos)",
        "url": "https://hqs-soquadrinhos.blogspot.com/2019/01/aranha-gedon-2018.html"
      }
    ]
  },
  {
    "id": "leitura-28",
    "readingGroup": 28,
    "title": "Amazing Spider-Man: Sins Rising Prelude (2020, one-shot)",
    "itemIds": [
      1055
    ],
    "context": "Abre Sins Rising (Amazing 2018 #45–49 = #846–850). É a fase em que Kindred ressuscita o Sin-Eater, visto na #37 do volume (#838).",
    "links": [
      {
        "label": "Arco completo (GoFile)",
        "url": "https://www.hq-now.com/hq-reader/32489/o-espetacular-homem-aranha-v5/chapter/44.1/page/1"
      }
    ]
  },
  {
    "id": "leitura-29",
    "readingGroup": 29,
    "title": "Amazing Spider-Man: The Sins of Norman Osborn (2020, one-shot)",
    "itemIds": [
      1060
    ],
    "context": "One-shot ligado a Sins Rising (Amazing 2018 #45–49).",
    "links": [
      {
        "label": "Arco completo (GoFile)",
        "url": "https://www.hq-now.com/hq-reader/32489/o-espetacular-homem-aranha-v5/chapter/44.1/page/1"
      }
    ]
  },
  {
    "id": "leitura-30",
    "readingGroup": 30,
    "title": "Amazing Spider-Man (2018) #50.LR a #54.LR (tie-ins pontuados de Last Remains)",
    "itemIds": [
      1062,
      1064,
      1066,
      1068,
      1070
    ],
    "context": "A história principal está na Amazing. As .LR são complementares e foram reunidas no 'Last Remains Companion'. Não contam na numeração.",
    "links": [
      {
        "label": "Link do drive com os capítulos",
        "url": "https://drive.google.com/drive/folders/1Nqbm2J-yx12u8OknZjtIFwkMr75yVtoM?usp=drive_link"
      }
    ]
  },
  {
    "id": "leitura-31",
    "readingGroup": 31,
    "title": "Dark Web Finale #1",
    "itemIds": [
      1131
    ],
    "context": "É o desfecho de Dark Web.",
    "links": [
      {
        "label": "AMS v6 (2022) + Finale",
        "url": "https://gofile.io/d/TldFOBKr"
      }
    ]
  },
  {
    "id": "leitura-32",
    "readingGroup": 32,
    "title": "Amazing Spider-Man: Gang War – First Strike #1 (2023)",
    "itemIds": [
      1152,
      1153,
      1154,
      1155,
      1156,
      1157,
      1158
    ],
    "context": "First Strike #1 abre o evento.",
    "links": [
      {
        "label": "First Strike (GoFile)",
        "url": "https://gofile.io/d/iRyin1Ht"
      }
    ]
  }
];

// Compatibilidade: código antigo pode esperar window.LINKS. Novos links devem ser adicionados acima.
window.LINKS = window.LINKS || {};

window.getEditorialLinks = () => window.EDITORIAL_LINKS;
})();
