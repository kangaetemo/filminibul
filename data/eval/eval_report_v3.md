# Değerlendirme Raporu

Oluşturulma: 2026-09-29T09:19:46.398Z · embedding v3 · semantic havuz 200 + keyword havuz 100

- **base**: semantic=0.4, keyword=0.25, genre=0.12, director=0.06, cast=0.04, year=0.03, language=0.03, quality=0.07, tmdbRec=0, collection=0
- **tmdb**: semantic=0.4, keyword=0.25, genre=0.12, director=0.06, cast=0.04, year=0.03, language=0.03, quality=0.07, tmdbRec=0.12, collection=0
- **full**: semantic=0.4, keyword=0.25, genre=0.12, director=0.06, cast=0.04, year=0.03, language=0.03, quality=0.07, tmdbRec=0.12, collection=0.1
- **fullLowKw**: semantic=0.45, keyword=0.15, genre=0.12, director=0.06, cast=0.04, year=0.03, language=0.03, quality=0.07, tmdbRec=0.12, collection=0.1
- **gated**: semantic=0.4, keyword=0.25, genre=0.12, director=0.06, cast=0.04, year=0.03, language=0.03, quality=0.07, tmdbRec=0.2, collection=0.1
- **gatedLowKw**: semantic=0.45, keyword=0.15, genre=0.12, director=0.06, cast=0.04, year=0.03, language=0.03, quality=0.07, tmdbRec=0.2, collection=0.1

## Özet

| Seed | beklenen | havuz | semantic @10 | semantic @20 | base @10 | base @20 | tmdb @10 | tmdb @20 | full @10 | full @20 | fullLowKw @10 | fullLowKw @20 | gated @10 | gated @20 | gatedLowKw @10 | gatedLowKw @20 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| The Matrix | 11 | 11 | 6 | 7 | 4 | 5 | 4 | 6 | 4 | 6 | 3 | 6 | 4 | 6 | 3 | 6 |
| Triangle | 10 | 2 | 0 | 0 | 1 | 1 | 1 | 1 | 1 | 1 | 0 | 0 | 1 | 1 | 0 | 0 |
| Coherence | 6 | 4 | 1 | 1 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| Spirited Away | 12 | 12 | 6 | 8 | 6 | 7 | 5 | 8 | 5 | 8 | 6 | 8 | 5 | 8 | 6 | 8 |
| Se7en | 11 | 11 | 3 | 5 | 4 | 7 | 4 | 7 | 4 | 7 | 3 | 7 | 4 | 7 | 3 | 6 |
| The Witch | 5 | 5 | 3 | 4 | 2 | 3 | 1 | 3 | 1 | 3 | 2 | 4 | 1 | 3 | 2 | 4 |
| Interstellar | 11 | 11 | 6 | 8 | 5 | 7 | 7 | 7 | 7 | 7 | 7 | 7 | 7 | 7 | 7 | 7 |
| Balzac and the Little Chinese Seamstress | 10 | 10 | 4 | 6 | 5 | 9 | 6 | 7 | 6 | 7 | 6 | 7 | 6 | 7 | 6 | 7 |
| **Ortalama recall** | | 86% | **38%** | **51%** | **38%** | **53%** | **38%** | **53%** | **38%** | **53%** | **38%** | **54%** | **38%** | **53%** | **38%** | **53%** |

## The Matrix

- Veritabanında yok (sayılmadı): eXistenZ (1999)
- Havuza hiç girmeyen (retrieval kaçırdı): -
- Havuzda ama full'ün Top 20'sinde değil (ranking kaçırdı): Ghost in the Shell, Dark City, Ex Machina, Akira, Blade Runner
- full Top 20'de bulunan: The Matrix Reloaded (#1), The Matrix Revolutions (#2), The Animatrix (#13), The Thirteenth Floor (#4), The Terminator (#9), Equilibrium (#19)

## Triangle

- Veritabanında yok (sayılmadı): Primer (2004), The Endless (2017)
- Havuza hiç girmeyen (retrieval kaçırdı): Timecrimes, Coherence, Predestination, Source Code, Donnie Darko, Jacob's Ladder, The Machinist, Time Trap
- Havuzda ama full'ün Top 20'sinde değil (ranking kaçırdı): Identity
- full Top 20'de bulunan: Happy Death Day (#9)

## Coherence

- Veritabanında yok (sayılmadı): Primer (2004), The Endless (2017), The Invitation (2015), Circle (2015), Another Earth (2011), The One I Love (2014)
- Havuza hiç girmeyen (retrieval kaçırdı): Triangle, Predestination
- Havuzda ama full'ün Top 20'sinde değil (ranking kaçırdı): Timecrimes, Cube
- full Top 20'de bulunan: The Thirteenth Floor (#5), Dark City (#2)

## Spirited Away

- Havuza hiç girmeyen (retrieval kaçırdı): -
- Havuzda ama full'ün Top 20'sinde değil (ranking kaçırdı): Princess Mononoke, Castle in the Sky, Nausicaä of the Valley of the Wind, Coraline
- full Top 20'de bulunan: Howl's Moving Castle (#4), My Neighbor Totoro (#3), Kiki's Delivery Service (#2), The Boy and the Heron (#8), Ponyo (#7), Pom Poko (#13), The Tale of The Princess Kaguya (#11), Wolf Children (#15)

## Se7en

- Veritabanında yok (sayılmadı): Kiss the Girls (1997)
- Havuza hiç girmeyen (retrieval kaçırdı): -
- Havuzda ama full'ün Top 20'sinde değil (ranking kaçırdı): Prisoners, Red Dragon, The Bone Collector, I Saw the Devil
- full Top 20'de bulunan: Zodiac (#1), The Silence of the Lambs (#17), Memories of Murder (#7), Manhunter (#15), Copycat (#14), The Crimson Rivers (#8), Insomnia (#4)

## The Witch

- Veritabanında yok (sayılmadı): Apostle (2018), Kill List (2011), A Dark Song (2016), The Blackcoat's Daughter (2015), Gretel & Hansel (2020), Saint Maud (2019), Lamb (2021)
- Havuza hiç girmeyen (retrieval kaçırdı): -
- Havuzda ama full'ün Top 20'sinde değil (ranking kaçırdı): The Wicker Man, The Ritual
- full Top 20'de bulunan: Hereditary (#13), Midsommar (#17), The Lighthouse (#1)

## Interstellar

- Veritabanında yok (sayılmadı): Ad Astra (2019)
- Havuza hiç girmeyen (retrieval kaçırdı): -
- Havuzda ama full'ün Top 20'sinde değil (ranking kaçırdı): Sunshine, Solaris, First Man, Annihilation
- full Top 20'de bulunan: Gravity (#2), The Martian (#5), Arrival (#8), Contact (#9), 2001: A Space Odyssey (#6), Moon (#10), Inception (#7)

## Balzac and the Little Chinese Seamstress

- Veritabanında yok (sayılmadı): Shower (1999), Postmen in the Mountains (1999)
- Havuza hiç girmeyen (retrieval kaçırdı): -
- Havuzda ama full'ün Top 20'sinde değil (ranking kaçırdı): Raise the Red Lantern, Not One Less, Coming Home
- full Top 20'de bulunan: To Live (#5), Farewell My Concubine (#2), The Blue Kite (#7), Xiu Xiu: The Sent-Down Girl (#4), Under the Hawthorn Tree (#6), The Road Home (#13), In the Heat of the Sun (#1)
