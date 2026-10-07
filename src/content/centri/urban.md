---
nome: Lume Urban
citta: Macerata (centro)
stato: aperto
ordine: 4
indirizzo: Viale Giacomo Leopardi 91, 62100 Macerata
coordinate:
  lat: 43.3014296
  lng: 13.4558179
telefono: "0733 232905"
email: urban@lumefitness.it
servizi:
  - "Sala pesi Panatta"
  - "Corsi live e on demand"
  - "Più ghisa, meno tecnologia"
  - "Spogliatoi premium"
  - "Nel centro storico"
  - "Parcheggio più libero dopo le 19"
sale:
  - nome: Reception e connettivo
    mq: 113
    dotazione: "Ingresso su viale Leopardi con parete verde, tornelli e lounge: divano, sgabelli e wall art. Piano terra alto 3,26 m."
    foto: ../../assets/centri/urban/foto-9.jpg
  - nome: Sala corsi
    mq: 56
    dotazione: "Parquet, archi in mattoni a vista e neon. Corsi live e programmazione on demand quando la sala è libera."
    foto: ../../assets/centri/urban/foto-8.jpg
  - nome: Spogliatoio donne
    mq: 111
    dotazione: "Armadietti a tutta altezza, panche, docce e wc. Zona specchi con lavabi in acciaio, phon e piani in grès."
    foto: ../../assets/centri/urban/foto-5.jpg
  - nome: Spogliatoio uomini
    mq: 71
    dotazione: "Armadietti a tutta altezza, panche in legno, docce e wc, zona specchi e phon."
    foto: ../../assets/centri/urban/foto-7.jpg
  - nome: Area allenamento — piano −1
    mq: 521
    dotazione: "Gym 1, Gym 2 e Gym 3 in un unico open space alto 3,53 m: sala pesi Panatta, linea isotonica Monolith, plate loaded, rack e pedane, corsia funzionale Xenios e zona cardio."
    foto: ../../assets/centri/urban/foto-6-2.jpg
render:
  - foto: ../../assets/centri/urban/foto-9.jpg
    didascalia: "Ingresso — tornelli e wall art"
  - foto: ../../assets/centri/urban/foto-1.jpg
    didascalia: "Sala corsi — la vetrata sul connettivo"
  - foto: ../../assets/centri/urban/foto-8.jpg
    didascalia: "Sala corsi — gli archi e i reformer"
  - foto: ../../assets/centri/urban/foto-3.jpg
    didascalia: "Sala corsi — vista dal connettivo"
  - foto: ../../assets/centri/urban/foto-4.jpg
    didascalia: "Sala corsi — il murale della Venere"
  - foto: ../../assets/centri/urban/foto-2.jpg
    didascalia: "Connettivo — il David"
  - foto: ../../assets/centri/urban/foto-7.jpg
    didascalia: "Spogliatoi — armadietti e panche"
  - foto: ../../assets/centri/urban/foto-5.jpg
    didascalia: "Spogliatoi — armadietti e zona specchi"
  - foto: ../../assets/centri/urban/foto-6.jpg
    didascalia: "Spogliatoi — la zona specchi"
  - foto: ../../assets/centri/urban/foto-6-2.jpg
    didascalia: "Area allenamento — piano −1"
tour:
  - id: "01"
    nome: "Ingresso"
    hotspot:
      - verso: "02"
        yaw: 115
        pitch: -10
      - verso: "07"
        yaw: 45
        pitch: -8
  - id: "02"
    nome: "Lounge"
    hotspot:
      - verso: "01"
        yaw: -165
        pitch: -8
      - verso: "07"
        yaw: 25
        pitch: -8
      - verso: "03"
        yaw: -60
        pitch: -8
  - id: "07"
    nome: "Corridoio"
    hotspot:
      - verso: "02"
        yaw: 115
        pitch: -8
      - verso: "03"
        yaw: -45
        pitch: -8
      - verso: "04"
        yaw: 165
        pitch: -5
  - id: "03"
    nome: "Sala corsi"
    hotspot:
      - verso: "07"
        yaw: 120
        pitch: -8
  - id: "04"
    nome: "Connettivo"
    hotspot:
      - verso: "07"
        yaw: -165
        pitch: -8
      - verso: "05"
        yaw: -20
        pitch: -5
  - id: "05"
    nome: "Spogliatoio"
    hotspot:
      - verso: "04"
        yaw: 20
        pitch: -5
      - verso: "08"
        yaw: -90
        pitch: -10
      - verso: "06"
        yaw: 90
        pitch: -8
  - id: "08"
    nome: "Spogliatoio · zona specchi"
    hotspot:
      - verso: "05"
        yaw: 90
        pitch: -8
      - verso: "06"
        yaw: 130
        pitch: -8
  - id: "06"
    nome: "Servizi"
    hotspot:
      - verso: "05"
        yaw: -160
        pitch: -8
      - verso: "08"
        yaw: 140
        pitch: -8
  - id: "09"
    nome: "Accesso area allenamento"
    hotspot:
      - verso: "10"
        yaw: 20
        pitch: -8
      - verso: "11"
        yaw: -35
        pitch: -8
      - verso: "07"
        yaw: -140
        pitch: 0
  - id: "10"
    nome: "Area allenamento 1"
    hotspot:
      - verso: "09"
        yaw: -170
        pitch: -8
      - verso: "11"
        yaw: 60
        pitch: -10
      - verso: "12"
        yaw: 140
        pitch: -10
  - id: "11"
    nome: "Area allenamento 2"
    hotspot:
      - verso: "10"
        yaw: 20
        pitch: -10
      - verso: "12"
        yaw: -120
        pitch: -10
      - verso: "09"
        yaw: 175
        pitch: -10
  - id: "12"
    nome: "Area allenamento 3"
    hotspot:
      - verso: "11"
        yaw: -100
        pitch: -10
      - verso: "10"
        yaw: 100
        pitch: -10
superficie: 1000
immagine: ../../assets/centri/urban/foto-1.jpg
video: https://pub-90d4a80741cd4aadb6d995599fefc986.r2.dev/site/urban-sala.mp4
videoPoster: ../../assets/centri/urban/foto-1.jpg
perfectgymUrl: "https://lumefitness.perfectgym.com/ClientPortal2/#/Registration"
planningNota: "Orario della stagione 26/27, aggiornato a ottobre."
planningAggiornatoIl: 2026-09-30
planning:
  - giorno: '1'
    inizio: '07:00'
    fine: '07:50'
    corso: 'LesMills Shapes'
    disciplina: lesmills-shapes
  - giorno: '1'
    inizio: '08:30'
    fine: '09:30'
    corso: 'LesMills BodyBalance'
    disciplina: lesmills-bodybalance
  - giorno: '1'
    inizio: '10:00'
    fine: '10:50'
    corso: 'LesMills Shapes'
    disciplina: lesmills-shapes
  - giorno: '1'
    inizio: '13:30'
    fine: '14:30'
    corso: 'LesMills BodyPump'
    disciplina: lesmills-bodypump
  - giorno: '1'
    inizio: '17:30'
    fine: '18:20'
    corso: 'Functional Training Hyrox'
  - giorno: '1'
    inizio: '17:30'
    fine: '18:30'
    corso: 'Reformer'
    disciplina: reformer
  - giorno: '1'
    inizio: '18:30'
    fine: '19:30'
    corso: 'LesMills BodyPump'
    disciplina: lesmills-bodypump
  - giorno: '1'
    inizio: '19:30'
    fine: '20:20'
    corso: 'LesMills Core'
    disciplina: lesmills-core
  - giorno: '2'
    inizio: '07:00'
    fine: '08:00'
    corso: 'LesMills BodyPump'
    disciplina: lesmills-bodypump
  - giorno: '2'
    inizio: '10:00'
    fine: '11:00'
    corso: 'Pilates'
    disciplina: pilates
  - giorno: '2'
    inizio: '13:30'
    fine: '14:30'
    corso: 'Pilates'
    disciplina: pilates
  - giorno: '2'
    inizio: '14:30'
    fine: '15:30'
    corso: 'LesMills BodyPump'
    disciplina: lesmills-bodypump
  - giorno: '2'
    inizio: '18:30'
    fine: '19:30'
    corso: 'Functional Training Hyrox'
  - giorno: '2'
    inizio: '19:30'
    fine: '20:20'
    corso: 'LesMills Shapes'
    disciplina: lesmills-shapes
  - giorno: '2'
    inizio: '20:30'
    fine: '21:30'
    corso: 'Pilates'
    disciplina: pilates
  - giorno: '3'
    inizio: '07:00'
    fine: '08:00'
    corso: 'Pilates'
    disciplina: pilates
  - giorno: '3'
    inizio: '08:30'
    fine: '09:30'
    corso: 'Yoga'
    disciplina: yoga
  - giorno: '3'
    inizio: '10:00'
    fine: '11:00'
    corso: 'Reformer'
    disciplina: reformer
  - giorno: '3'
    inizio: '13:30'
    fine: '14:20'
    corso: 'Functional Training Hyrox'
  - giorno: '3'
    inizio: '13:30'
    fine: '14:20'
    corso: 'LesMills Core'
    disciplina: lesmills-core
  - giorno: '3'
    inizio: '17:30'
    fine: '18:30'
    corso: 'LesMills BodyPump'
    disciplina: lesmills-bodypump
  - giorno: '3'
    inizio: '19:30'
    fine: '20:30'
    corso: 'LesMills BodyPump'
    disciplina: lesmills-bodypump
  - giorno: '4'
    inizio: '08:30'
    fine: '09:30'
    corso: 'Reformer'
    disciplina: reformer
  - giorno: '4'
    inizio: '10:00'
    fine: '11:00'
    corso: 'Pilates'
    disciplina: pilates
  - giorno: '4'
    inizio: '13:30'
    fine: '14:30'
    corso: 'Reformer'
    disciplina: reformer
  - giorno: '4'
    inizio: '14:30'
    fine: '15:30'
    corso: 'LesMills BodyPump'
    disciplina: lesmills-bodypump
  - giorno: '4'
    inizio: '18:30'
    fine: '19:30'
    corso: 'LesMills BodyPump'
    disciplina: lesmills-bodypump
  - giorno: '4'
    inizio: '19:30'
    fine: '20:30'
    corso: 'Functional Training Hyrox'
  - giorno: '4'
    inizio: '19:30'
    fine: '20:30'
    corso: 'Pilates'
    disciplina: pilates
  - giorno: '4'
    inizio: '20:30'
    fine: '21:20'
    corso: 'LesMills Shapes'
    disciplina: lesmills-shapes
  - giorno: '5'
    inizio: '07:00'
    fine: '08:00'
    corso: 'Yoga'
    disciplina: yoga
  - giorno: '5'
    inizio: '08:30'
    fine: '09:30'
    corso: 'Pilates'
    disciplina: pilates
  - giorno: '5'
    inizio: '10:00'
    fine: '11:00'
    corso: 'Pilates'
    disciplina: pilates
  - giorno: '5'
    inizio: '13:30'
    fine: '14:30'
    corso: 'LesMills BodyPump'
    disciplina: lesmills-bodypump
  - giorno: '5'
    inizio: '17:30'
    fine: '18:30'
    corso: 'LesMills BodyPump'
    disciplina: lesmills-bodypump
  - giorno: '5'
    inizio: '18:30'
    fine: '19:30'
    corso: 'LesMills BodyBalance'
    disciplina: lesmills-bodybalance
listino:
  nota: Un listino a fasce d'età. I prezzi valgono dall'apertura del centro.
  attivazione: 50
  piani:
    - nome: Under 30
      per: Fino a 30 anni
      annuale: 420
      rate: 456
      mensile: 55
      evidenza: true
      pgm:
        annuale: https://lumefitness.perfectgym.com/ClientPortal2/Registration/Start?clubID=3&PaymentPlanId=167
        rate: https://lumefitness.perfectgym.com/ClientPortal2/Registration/Start?clubID=3&PaymentPlanId=170
        mensile: https://lumefitness.perfectgym.com/ClientPortal2/Registration/Start?clubID=3&PaymentPlanId=171
    - nome: Over 30
      per: Dai 30 anni in su
      annuale: 540
      rate: 576
      mensile: 65
      evidenza: false
      pgm:
        annuale: https://lumefitness.perfectgym.com/ClientPortal2/Registration/Start?clubID=3&PaymentPlanId=188
        rate: https://lumefitness.perfectgym.com/ClientPortal2/Registration/Start?clubID=3&PaymentPlanId=189
        mensile: https://lumefitness.perfectgym.com/ClientPortal2/Registration/Start?clubID=3&PaymentPlanId=171
---

**Allenati forte. Senza complicazioni.** Urban è lo strength club di Lume in
centro a Macerata: più ghisa e meno tecnologia, per scelta. Sala pesi Panatta,
corsi live e on demand, nessuna sovrastruttura.

Un centro su due piani. Al piano terra reception, lounge, sala
corsi e spogliatoi; al piano −1 l'area allenamento in open space, con
la sala
pesi Panatta, la linea isotonica Monolith, rack e pedane, la corsia funzionale
e la zona cardio. Finiture in grès Boston White, pavimento in PVC nero nelle aree
gym e rosso sulle scale.

Siamo su viale Leopardi 91, nel centro storico, dove dopo le 19 il parcheggio si
libera.
