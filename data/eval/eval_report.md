# Değerlendirme Raporu

Oluşturulma: 2026-09-29T07:58:41.145Z · semantic havuz 200 + keyword havuz 100

- **A**: semantic=0.4, keyword=0.25, genre=0.12, director=0.06, cast=0.04, year=0.03, language=0.03, quality=0.07
- **B**: semantic=0.3, keyword=0.35, genre=0.12, director=0.06, cast=0.04, year=0.03, language=0.02, quality=0.08
- **C**: semantic=0.25, keyword=0.3, genre=0.18, director=0.07, cast=0.04, year=0.03, language=0.03, quality=0.1
- **D**: semantic=0.4, keyword=0.25, genre=0.12, director=0.06, cast=0.04, year=0.03, language=0.03, quality=0.07

## Özet

| Seed | beklenen | havuz | semantic @10 | semantic @20 | A @10 | A @20 | B @10 | B @20 | C @10 | C @20 | D @10 | D @20 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| The Matrix | 11 | 11 | 4 | 7 | 4 | 6 | 4 | 6 | 4 | 4 | 4 | 6 |
| Triangle | 10 | 3 | 0 | 1 | 1 | 2 | 1 | 2 | 1 | 1 | 1 | 2 |
| Coherence | 6 | 3 | 0 | 1 | 2 | 3 | 2 | 3 | 2 | 3 | 2 | 3 |
| Spirited Away | 12 | 12 | 8 | 8 | 4 | 7 | 3 | 4 | 3 | 5 | 5 | 8 |
| Se7en | 11 | 11 | 1 | 4 | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 6 |
| The Witch | 5 | 5 | 3 | 4 | 3 | 4 | 2 | 3 | 2 | 3 | 3 | 4 |
| Interstellar | 11 | 11 | 4 | 4 | 3 | 6 | 2 | 6 | 3 | 6 | 3 | 6 |
| Balzac and the Little Chinese Seamstress | 10 | 10 | 3 | 4 | 6 | 7 | 4 | 7 | 5 | 7 | 6 | 9 |
| **Ortalama recall** | | 85% | **30%** | **44%** | **39%** | **55%** | **32%** | **50%** | **35%** | **47%** | **40%** | **59%** |

## The Matrix

- Veritabanında yok (sayılmadı): eXistenZ (1999)
- Havuza hiç girmeyen (retrieval kaçırdı): -
- Havuzda ama A'nın Top 20'sinde değil (ranking kaçırdı): Ghost in the Shell, Dark City, Ex Machina, Akira, Equilibrium
- A Top 20'de bulunan: The Matrix Reloaded (#1), The Matrix Revolutions (#3), The Animatrix (#5), The Thirteenth Floor (#18), The Terminator (#4), Blade Runner (#17)

## Triangle

- Veritabanında yok (sayılmadı): Primer (2004), The Endless (2017)
- Havuza hiç girmeyen (retrieval kaçırdı): Timecrimes, Coherence, Predestination, Source Code, Donnie Darko, Jacob's Ladder, The Machinist
- Havuzda ama A'nın Top 20'sinde değil (ranking kaçırdı): Time Trap
- A Top 20'de bulunan: Happy Death Day (#2), Identity (#18)

## Coherence

- Veritabanında yok (sayılmadı): Primer (2004), The Endless (2017), The Invitation (2015), Circle (2015), Another Earth (2011), The One I Love (2014)
- Havuza hiç girmeyen (retrieval kaçırdı): Triangle, Timecrimes, Predestination
- Havuzda ama A'nın Top 20'sinde değil (ranking kaçırdı): -
- A Top 20'de bulunan: The Thirteenth Floor (#8), Dark City (#4), Cube (#13)

## Spirited Away

- Havuza hiç girmeyen (retrieval kaçırdı): -
- Havuzda ama A'nın Top 20'sinde değil (ranking kaçırdı): Princess Mononoke, Kiki's Delivery Service, Castle in the Sky, The Boy and the Heron, Nausicaä of the Valley of the Wind
- A Top 20'de bulunan: Howl's Moving Castle (#1), My Neighbor Totoro (#4), Ponyo (#2), Pom Poko (#10), The Tale of The Princess Kaguya (#14), Coraline (#15), Wolf Children (#19)

## Se7en

- Veritabanında yok (sayılmadı): Kiss the Girls (1997)
- Havuza hiç girmeyen (retrieval kaçırdı): -
- Havuzda ama A'nın Top 20'sinde değil (ranking kaçırdı): Prisoners, Red Dragon, The Bone Collector, Copycat, I Saw the Devil
- A Top 20'de bulunan: Zodiac (#2), The Silence of the Lambs (#9), Memories of Murder (#3), Manhunter (#7), The Crimson Rivers (#4), Insomnia (#1)

## The Witch

- Veritabanında yok (sayılmadı): Apostle (2018), Kill List (2011), A Dark Song (2016), The Blackcoat's Daughter (2015), Gretel & Hansel (2020), Saint Maud (2019), Lamb (2021)
- Havuza hiç girmeyen (retrieval kaçırdı): -
- Havuzda ama A'nın Top 20'sinde değil (ranking kaçırdı): The Wicker Man
- A Top 20'de bulunan: Hereditary (#12), Midsommar (#7), The Lighthouse (#1), The Ritual (#9)

## Interstellar

- Veritabanında yok (sayılmadı): Ad Astra (2019)
- Havuza hiç girmeyen (retrieval kaçırdı): -
- Havuzda ama A'nın Top 20'sinde değil (ranking kaçırdı): Contact, Sunshine, Solaris, First Man, Annihilation
- A Top 20'de bulunan: Gravity (#4), The Martian (#2), Arrival (#11), 2001: A Space Odyssey (#14), Moon (#20), Inception (#5)

## Balzac and the Little Chinese Seamstress

- Veritabanında yok (sayılmadı): Shower (1999), Postmen in the Mountains (1999)
- Havuza hiç girmeyen (retrieval kaçırdı): -
- Havuzda ama A'nın Top 20'sinde değil (ranking kaçırdı): Under the Hawthorn Tree, The Road Home, Coming Home
- A Top 20'de bulunan: To Live (#3), Farewell My Concubine (#2), The Blue Kite (#4), Raise the Red Lantern (#10), Xiu Xiu: The Sent-Down Girl (#8), Not One Less (#12), In the Heat of the Sun (#1)
