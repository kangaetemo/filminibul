# Rerank Raporu

Oluşturulma: 2026-09-29T07:50:19.068Z · Aday havuzu: 200 · Top: 20

Ağırlıklar: semantic=0.4, keyword=0.25, genre=0.12, director=0.06, cast=0.04, year=0.03, language=0.03, quality=0.07

## The Matrix (1999) — 603

Yönetmen: Lana Wachowski · Türler: Action, Science Fiction · Oy: 27272

Keywords: man vs machine, martial arts, kung fu, dreams, artificial intelligence (a.i.), saving the world, hacker, self sacrifice, virtual reality, fight, prophecy, truth, philosophy, dystopia, insurgence, pill, simulated reality , cyberpunk, dream world, messiah, disturbed, action hero, gnosticism, baffled, distressing, allegory of the cave, dystopian sci-fi

| # | Saf semantic | cos | Hybrid rerank | final | neden |
|---|---|---|---|---|---|
| 1 | The Matrix Revolutions (2003) | 0.84 | The Matrix Reloaded (2003) | 0.95 | aynı yönetmen (Lana Wachowski) · ortak temalar: gnosticism, truth, dystopian sci-fi · ortak türler: Science Fiction, Action · ortak oyuncu: Keanu Reeves, Laurence Fishburne |
| 2 | The Matrix Reloaded (2003) | 0.83 | The Matrix Resurrections (2021) | 0.90 | aynı yönetmen (Lana Wachowski) · ortak temalar: gnosticism, dream world, dystopian sci-fi · ortak türler: Science Fiction, Action · ortak oyuncu: Keanu Reeves, Carrie-Anne Moss |
| 3 | The Matrix Resurrections (2021) | 0.77 | The Matrix Revolutions (2003) | 0.88 | ortak temalar: gnosticism, truth, dystopian sci-fi · ortak türler: Science Fiction, Action · ortak oyuncu: Keanu Reeves, Laurence Fishburne |
| 4 | The Animatrix (2003) | 0.72 | The Terminator (1984) | 0.59 | ortak temalar: dystopian sci-fi, man vs machine, saving the world · ortak türler: Science Fiction, Action |
| 5 | The Terminator (1984) | 0.62 | The Animatrix (2003) | 0.56 | ortak temalar: hacker, virtual reality, cyberpunk · ortak oyuncu: Keanu Reeves, Carrie-Anne Moss |
| 6 | Tron (1982) | 0.60 | Terminator Salvation (2009) | 0.55 | ortak temalar: prophecy, saving the world, artificial intelligence (a.i.) · ortak türler: Science Fiction, Action |
| 7 | Elysium (2013) | 0.60 | Tron (1982) | 0.55 | ortak temalar: simulated reality , hacker, virtual reality · ortak türler: Science Fiction, Action |
| 8 | I, Robot (2004) | 0.59 | Terminator 3: Rise of the Machines (2003) | 0.54 | ortak temalar: man vs machine, saving the world, artificial intelligence (a.i.) · ortak türler: Science Fiction, Action |
| 9 | Terminator Salvation (2009) | 0.59 | I, Robot (2004) | 0.52 | ortak temalar: man vs machine, artificial intelligence (a.i.), dystopia · ortak türler: Science Fiction, Action |
| 10 | Terminator 2: Judgment Day (1991) | 0.59 | Terminator 2: Judgment Day (1991) | 0.51 | ortak temalar: man vs machine, action hero, dystopia · ortak türler: Science Fiction, Action |
| 11 | Transcendence (2014) | 0.58 | Inception (2010) | 0.51 | ortak temalar: dream world, philosophy, virtual reality · ortak türler: Science Fiction, Action |
| 12 | Terminator 3: Rise of the Machines (2003) | 0.58 | Ghost in the Shell (2017) | 0.50 | ortak temalar: hacker, philosophy, cyberpunk · ortak türler: Science Fiction, Action |
| 13 | Terminator Genisys (2015) | 0.57 | Blade Runner 2049 (2017) | 0.50 | ortak temalar: dystopian sci-fi, cyberpunk, artificial intelligence (a.i.) |
| 14 | Ghost in the Shell (1995) | 0.57 | The Creator (2023) | 0.50 | ortak temalar: dystopian sci-fi, cyberpunk, artificial intelligence (a.i.) · ortak türler: Science Fiction, Action |
| 15 | Demolition Man (1993) | 0.56 | Terminator Genisys (2015) | 0.49 | ortak temalar: saving the world, artificial intelligence (a.i.), dystopia · ortak türler: Science Fiction, Action |
| 16 | The Creator (2023) | 0.56 | Upgrade (2018) | 0.48 | ortak temalar: hacker, cyberpunk, artificial intelligence (a.i.) · ortak türler: Science Fiction, Action |
| 17 | Gunhed (1989) | 0.56 | Blade Runner (1982) | 0.47 | ortak temalar: dystopian sci-fi, cyberpunk, artificial intelligence (a.i.) |
| 18 | Akira (1988) | 0.56 | The Thirteenth Floor (1999) | 0.47 | ortak temalar: simulated reality , virtual reality, artificial intelligence (a.i.) |
| 19 | Ex Machina (2015) | 0.56 | Demolition Man (1993) | 0.46 | ortak temalar: cyberpunk, dystopia, martial arts · ortak türler: Science Fiction, Action |
| 20 | Live Free or Die Hard (2007) | 0.56 | Dredd (2012) | 0.46 | ortak temalar: cyberpunk, dystopia · ortak türler: Science Fiction, Action |

<details><summary>Bileşen debug (ağırlıklı katkılar)</summary>

| # | Film | cos | semantic | keyword | genre | director | cast | year | language | quality | ceza | FINAL |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | The Matrix Reloaded (2003) | 0.83 | 0.40 | 0.25 | 0.09 | 0.06 | 0.04 | 0.02 | 0.03 | 0.07 | - | **0.95** |
| 2 | The Matrix Resurrections (2021) | 0.77 | 0.35 | 0.25 | 0.10 | 0.06 | 0.04 | 0.01 | 0.03 | 0.06 | - | **0.90** |
| 3 | The Matrix Revolutions (2003) | 0.84 | 0.40 | 0.24 | 0.09 | 0.00 | 0.04 | 0.02 | 0.03 | 0.07 | - | **0.88** |
| 4 | The Terminator (1984) | 0.62 | 0.25 | 0.12 | 0.10 | 0.00 | 0.00 | 0.01 | 0.03 | 0.07 | - | **0.59** |
| 5 | The Animatrix (2003) | 0.72 | 0.32 | 0.16 | 0.07 | 0.00 | 0.04 | 0.02 | 0.03 | 0.06 | genreMismatch −0.15 | **0.56** |
| 6 | Terminator Salvation (2009) | 0.59 | 0.23 | 0.10 | 0.10 | 0.00 | 0.00 | 0.02 | 0.03 | 0.06 | - | **0.55** |
| 7 | Tron (1982) | 0.60 | 0.24 | 0.11 | 0.10 | 0.00 | 0.00 | 0.01 | 0.03 | 0.06 | - | **0.55** |
| 8 | Terminator 3: Rise of the Machines (2003) | 0.58 | 0.23 | 0.10 | 0.10 | 0.00 | 0.00 | 0.02 | 0.03 | 0.06 | - | **0.54** |
| 9 | I, Robot (2004) | 0.59 | 0.24 | 0.05 | 0.12 | 0.00 | 0.00 | 0.02 | 0.03 | 0.07 | - | **0.52** |
| 10 | Terminator 2: Judgment Day (1991) | 0.59 | 0.23 | 0.06 | 0.10 | 0.00 | 0.00 | 0.02 | 0.03 | 0.07 | - | **0.51** |
| 11 | Inception (2010) | 0.53 | 0.20 | 0.10 | 0.10 | 0.00 | 0.00 | 0.02 | 0.03 | 0.07 | - | **0.51** |
| 12 | Ghost in the Shell (2017) | 0.54 | 0.20 | 0.09 | 0.11 | 0.00 | 0.00 | 0.01 | 0.03 | 0.06 | - | **0.50** |
| 13 | Blade Runner 2049 (2017) | 0.55 | 0.20 | 0.10 | 0.09 | 0.00 | 0.00 | 0.01 | 0.03 | 0.07 | - | **0.50** |
| 14 | The Creator (2023) | 0.56 | 0.21 | 0.09 | 0.10 | 0.00 | 0.00 | 0.01 | 0.03 | 0.06 | - | **0.50** |
| 15 | Terminator Genisys (2015) | 0.57 | 0.22 | 0.08 | 0.09 | 0.00 | 0.00 | 0.01 | 0.03 | 0.06 | - | **0.49** |
| 16 | Upgrade (2018) | 0.54 | 0.20 | 0.07 | 0.10 | 0.00 | 0.00 | 0.01 | 0.03 | 0.07 | - | **0.48** |
| 17 | Blade Runner (1982) | 0.55 | 0.21 | 0.08 | 0.07 | 0.00 | 0.00 | 0.01 | 0.03 | 0.07 | - | **0.47** |
| 18 | The Thirteenth Floor (1999) | 0.52 | 0.18 | 0.11 | 0.06 | 0.00 | 0.00 | 0.03 | 0.03 | 0.06 | - | **0.47** |
| 19 | Demolition Man (1993) | 0.56 | 0.22 | 0.04 | 0.10 | 0.00 | 0.00 | 0.02 | 0.03 | 0.06 | - | **0.46** |
| 20 | Dredd (2012) | 0.53 | 0.20 | 0.04 | 0.12 | 0.00 | 0.00 | 0.02 | 0.03 | 0.06 | - | **0.46** |

</details>

## Triangle (2009) — 26466

Yönetmen: Christopher Smith · Türler: Horror · Oy: 2873

Keywords: florida, ship, ocean, key, autism, ghost ship, murder, purgatory, time loop, female protagonist, storm, single mother, axe murder, caribbean sea, sisyphus, abusive mother, complex, ax

| # | Saf semantic | cos | Hybrid rerank | final | neden |
|---|---|---|---|---|---|
| 1 | Triangle of Sadness (2022) | 0.63 | Talk to Me (2023) | 0.57 | ortak temalar: female protagonist |
| 2 | The Bay (2026) | 0.60 | Happy Death Day (2017) | 0.57 | ortak temalar: time loop, murder |
| 3 | Beneath the Surface (2022) | 0.60 | The Reef: Stalked (2022) | 0.54 | ortak temalar: murder |
| 4 | Something in the Water (2024) | 0.59 | Something in the Water (2024) | 0.53 | hikâye ve atmosfer benzerliği |
| 5 | Pacific Fear (2024) | 0.58 | Strange Darling (2024) | 0.52 | ortak temalar: female protagonist, murder |
| 6 | The Reef: Stalked (2022) | 0.57 | The Texas Chainsaw Massacre (2003) | 0.52 | ortak temalar: murder |
| 7 | Blink Twice (2024) | 0.56 | Pearl (2022) | 0.51 | ortak temalar: murder |
| 8 | Writers Retreat (2015) | 0.55 | 🔑 The Brain (1988) | 0.51 | ortak temalar: axe murder, murder |
| 9 | Lost Things (2004) | 0.55 | It Follows (2015) | 0.51 | hikâye ve atmosfer benzerliği |
| 10 | Deadly Game (1991) | 0.55 | Beneath the Surface (2022) | 0.51 | hikâye ve atmosfer benzerliği |
| 11 | Mania (2015) | 0.55 | Triangle of Sadness (2022) | 0.51 | hikâye ve atmosfer benzerliği |
| 12 | Ring (1998) | 0.55 | 🔑 Before I Fall (2017) | 0.50 | ortak temalar: time loop, female protagonist |
| 13 | Islands (2025) | 0.54 | Possession (1981) | 0.50 | ortak temalar: murder |
| 14 | Not Without Hope (2025) | 0.54 | Pirates of the Caribbean: Dead Men Tell No Tales (2017) | 0.50 | ortak temalar: caribbean sea |
| 15 | Killer Whale (2026) | 0.54 | Influencer (2023) | 0.50 | ortak temalar: female protagonist |
| 16 | Send Help (2026) | 0.54 | Until Dawn (2025) | 0.50 | ortak temalar: time loop |
| 17 | Project Ithaca (2019) | 0.54 | The Last House on the Left (2009) | 0.50 | ortak temalar: murder |
| 18 | Talk to Me (2023) | 0.54 | Identity (2003) | 0.50 | ortak temalar: storm, murder |
| 19 | It Follows (2015) | 0.54 | Escape Room (2019) | 0.50 | ortak temalar: key |
| 20 | Identity (2003) | 0.54 | Together (2025) | 0.49 | hikâye ve atmosfer benzerliği |

<details><summary>Bileşen debug (ağırlıklı katkılar)</summary>

| # | Film | cos | semantic | keyword | genre | director | cast | year | language | quality | ceza | FINAL |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Talk to Me (2023) | 0.54 | 0.32 | 0.03 | 0.12 | 0.00 | 0.00 | 0.02 | 0.03 | 0.06 | - | **0.57** |
| 2 | Happy Death Day (2017) | 0.49 | 0.27 | 0.12 | 0.07 | 0.00 | 0.00 | 0.02 | 0.03 | 0.06 | - | **0.57** |
| 3 | The Reef: Stalked (2022) | 0.57 | 0.34 | 0.03 | 0.09 | 0.00 | 0.00 | 0.02 | 0.03 | 0.03 | - | **0.54** |
| 4 | Something in the Water (2024) | 0.59 | 0.36 | 0.00 | 0.09 | 0.00 | 0.00 | 0.01 | 0.03 | 0.04 | - | **0.53** |
| 5 | Strange Darling (2024) | 0.49 | 0.27 | 0.07 | 0.09 | 0.00 | 0.00 | 0.01 | 0.03 | 0.05 | - | **0.52** |
| 6 | The Texas Chainsaw Massacre (2003) | 0.49 | 0.27 | 0.02 | 0.12 | 0.00 | 0.00 | 0.02 | 0.03 | 0.05 | - | **0.52** |
| 7 | Pearl (2022) | 0.52 | 0.30 | 0.02 | 0.09 | 0.00 | 0.00 | 0.02 | 0.03 | 0.06 | - | **0.51** |
| 8 | 🔑 The Brain (1988) | 0.45 | 0.24 | 0.13 | 0.08 | 0.00 | 0.00 | 0.01 | 0.03 | 0.03 | - | **0.51** |
| 9 | It Follows (2015) | 0.54 | 0.32 | 0.00 | 0.08 | 0.00 | 0.00 | 0.02 | 0.03 | 0.06 | - | **0.51** |
| 10 | Beneath the Surface (2022) | 0.60 | 0.37 | 0.00 | 0.06 | 0.00 | 0.00 | 0.02 | 0.03 | 0.03 | - | **0.51** |
| 11 | Triangle of Sadness (2022) | 0.63 | 0.40 | 0.00 | 0.00 | 0.00 | 0.00 | 0.02 | 0.03 | 0.06 | - | **0.51** |
| 12 | 🔑 Before I Fall (2017) | 0.45 | 0.23 | 0.16 | 0.00 | 0.00 | 0.00 | 0.02 | 0.03 | 0.06 | - | **0.50** |
| 13 | Possession (1981) | 0.49 | 0.27 | 0.02 | 0.12 | 0.00 | 0.00 | 0.01 | 0.03 | 0.06 | - | **0.50** |
| 14 | Pirates of the Caribbean: Dead Men Tell No Tales (2017) | 0.51 | 0.29 | 0.09 | 0.00 | 0.00 | 0.00 | 0.02 | 0.03 | 0.07 | - | **0.50** |
| 15 | Influencer (2023) | 0.48 | 0.27 | 0.06 | 0.09 | 0.00 | 0.00 | 0.02 | 0.03 | 0.04 | - | **0.50** |
| 16 | Until Dawn (2025) | 0.49 | 0.27 | 0.05 | 0.08 | 0.00 | 0.00 | 0.01 | 0.03 | 0.05 | - | **0.50** |
| 17 | The Last House on the Left (2009) | 0.51 | 0.29 | 0.03 | 0.07 | 0.00 | 0.00 | 0.03 | 0.03 | 0.05 | - | **0.50** |
| 18 | Identity (2003) | 0.54 | 0.31 | 0.07 | 0.00 | 0.00 | 0.00 | 0.02 | 0.03 | 0.06 | - | **0.50** |
| 19 | Escape Room (2019) | 0.49 | 0.27 | 0.05 | 0.07 | 0.00 | 0.00 | 0.02 | 0.03 | 0.06 | - | **0.50** |
| 20 | Together (2025) | 0.52 | 0.30 | 0.00 | 0.09 | 0.00 | 0.00 | 0.01 | 0.03 | 0.05 | - | **0.49** |

</details>

## Coherence (2014) — 220289

Yönetmen: James Ward Byrkit · Türler: Thriller, Science Fiction · Oy: 3260

Keywords: clone, paranoia, comet, alter ego, reunion, friends, power outage, biting, candle, parallel world, alternative reality, dinner party, ketamine, quantum physics, broken cellphone, glowstick, excited, jantar

| # | Saf semantic | cos | Hybrid rerank | final | neden |
|---|---|---|---|---|---|
| 1 | Companion (2025) | 0.60 | Greenland (2020) | 0.62 | ortak temalar: comet · ortak türler: Science Fiction, Thriller |
| 2 | Good Time Charley (2025) | 0.59 | Companion (2025) | 0.60 | ortak türler: Science Fiction, Thriller |
| 3 | Beyond (2014) | 0.57 | Melancholia (2011) | 0.58 | ortak temalar: power outage |
| 4 | Polar Storm (2009) | 0.57 | Dark City (1998) | 0.58 | ortak temalar: alternative reality, parallel world, paranoia |
| 5 | Greenland (2020) | 0.57 | 10 Cloverfield Lane (2016) | 0.57 | ortak temalar: paranoia · ortak türler: Science Fiction, Thriller |
| 6 | House of Demons (2018) | 0.56 | What Happened to Monday (2017) | 0.55 | ortak temalar: alternative reality · ortak türler: Science Fiction, Thriller |
| 7 | The Companion (1994) | 0.55 | Bugonia (2025) | 0.54 | ortak temalar: paranoia · ortak türler: Science Fiction, Thriller |
| 8 | Red Lights (2012) | 0.54 | 🔑 The Thirteenth Floor (1999) | 0.53 | ortak temalar: alternative reality, parallel world · ortak türler: Science Fiction, Thriller |
| 9 | Critters (1986) | 0.54 | Bokeh (2017) | 0.52 | ortak türler: Science Fiction, Thriller |
| 10 | Distant Thunder (2022) | 0.54 | The Substance (2024) | 0.52 | ortak türler: Science Fiction, Thriller |
| 11 | Copycat (1995) | 0.54 | Beyond (2014) | 0.51 | hikâye ve atmosfer benzerliği |
| 12 | Dark City (1998) | 0.54 | Red Lights (2012) | 0.51 | hikâye ve atmosfer benzerliği |
| 13 | Circumstances (2009) | 0.54 | Cube (1998) | 0.51 | ortak türler: Science Fiction, Thriller |
| 14 | Bokeh (2017) | 0.53 | The Gorge (2025) | 0.51 | ortak türler: Science Fiction, Thriller |
| 15 | Together (2025) | 0.53 | Star Trek (2009) | 0.51 | ortak temalar: alternative reality |
| 16 | Go (1999) | 0.53 | Knowing (2009) | 0.50 | ortak türler: Science Fiction, Thriller |
| 17 | Leave the World Behind (2023) | 0.53 | Deep Impact (1998) | 0.50 | ortak temalar: comet |
| 18 | The Lesser Evil (1998) | 0.53 | 🔑 Caddo Lake (2024) | 0.50 | ortak temalar: alternative reality · ortak türler: Science Fiction, Thriller |
| 19 | Touch Me (2026) | 0.53 | Déjà Vu (2006) | 0.50 | ortak türler: Science Fiction, Thriller |
| 20 | The Crazies (2010) | 0.53 | Source Code (2011) | 0.49 | ortak türler: Science Fiction, Thriller |

<details><summary>Bileşen debug (ağırlıklı katkılar)</summary>

| # | Film | cos | semantic | keyword | genre | director | cast | year | language | quality | ceza | FINAL |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Greenland (2020) | 0.57 | 0.36 | 0.06 | 0.09 | 0.00 | 0.00 | 0.02 | 0.03 | 0.06 | - | **0.62** |
| 2 | Companion (2025) | 0.60 | 0.40 | 0.00 | 0.10 | 0.00 | 0.00 | 0.02 | 0.03 | 0.06 | - | **0.60** |
| 3 | Melancholia (2011) | 0.53 | 0.31 | 0.07 | 0.09 | 0.00 | 0.00 | 0.03 | 0.03 | 0.06 | - | **0.58** |
| 4 | Dark City (1998) | 0.54 | 0.32 | 0.08 | 0.07 | 0.00 | 0.00 | 0.01 | 0.03 | 0.06 | - | **0.58** |
| 5 | 10 Cloverfield Lane (2016) | 0.51 | 0.29 | 0.06 | 0.09 | 0.00 | 0.00 | 0.03 | 0.03 | 0.07 | - | **0.57** |
| 6 | What Happened to Monday (2017) | 0.51 | 0.30 | 0.05 | 0.09 | 0.00 | 0.00 | 0.03 | 0.03 | 0.07 | - | **0.55** |
| 7 | Bugonia (2025) | 0.52 | 0.30 | 0.03 | 0.09 | 0.00 | 0.00 | 0.02 | 0.03 | 0.06 | - | **0.54** |
| 8 | 🔑 The Thirteenth Floor (1999) | 0.45 | 0.22 | 0.11 | 0.09 | 0.00 | 0.00 | 0.01 | 0.03 | 0.06 | - | **0.53** |
| 9 | Bokeh (2017) | 0.53 | 0.32 | 0.00 | 0.11 | 0.00 | 0.00 | 0.03 | 0.03 | 0.04 | - | **0.52** |
| 10 | The Substance (2024) | 0.53 | 0.31 | 0.00 | 0.10 | 0.00 | 0.00 | 0.02 | 0.03 | 0.06 | - | **0.52** |
| 11 | Beyond (2014) | 0.57 | 0.36 | 0.00 | 0.07 | 0.00 | 0.00 | 0.03 | 0.03 | 0.02 | - | **0.51** |
| 12 | Red Lights (2012) | 0.54 | 0.33 | 0.00 | 0.07 | 0.00 | 0.00 | 0.03 | 0.03 | 0.05 | - | **0.51** |
| 13 | Cube (1998) | 0.53 | 0.31 | 0.00 | 0.09 | 0.00 | 0.00 | 0.01 | 0.03 | 0.06 | - | **0.51** |
| 14 | The Gorge (2025) | 0.51 | 0.29 | 0.00 | 0.10 | 0.00 | 0.00 | 0.02 | 0.03 | 0.07 | - | **0.51** |
| 15 | Star Trek (2009) | 0.50 | 0.28 | 0.04 | 0.06 | 0.00 | 0.00 | 0.02 | 0.03 | 0.07 | - | **0.51** |
| 16 | Knowing (2009) | 0.52 | 0.30 | 0.00 | 0.09 | 0.00 | 0.00 | 0.02 | 0.03 | 0.06 | - | **0.50** |
| 17 | Deep Impact (1998) | 0.48 | 0.26 | 0.07 | 0.07 | 0.00 | 0.00 | 0.01 | 0.03 | 0.06 | - | **0.50** |
| 18 | 🔑 Caddo Lake (2024) | 0.46 | 0.23 | 0.08 | 0.09 | 0.00 | 0.00 | 0.02 | 0.03 | 0.05 | - | **0.50** |
| 19 | Déjà Vu (2006) | 0.50 | 0.28 | 0.00 | 0.10 | 0.00 | 0.00 | 0.02 | 0.03 | 0.06 | - | **0.50** |
| 20 | Source Code (2011) | 0.50 | 0.27 | 0.00 | 0.09 | 0.00 | 0.00 | 0.03 | 0.03 | 0.07 | - | **0.49** |

</details>

## Spirited Away (2001) — 129

Yönetmen: Hayao Miyazaki · Türler: Animation, Family, Fantasy · Oy: 17866

Keywords: witch, parent child relationship, darkness, bath house, magic, spirit, parallel world, amusement park, youkai, japanese mythology, anime

| # | Saf semantic | cos | Hybrid rerank | final | neden |
|---|---|---|---|---|---|
| 1 | Howl's Moving Castle (2004) | 0.72 | Howl's Moving Castle (2004) | 0.71 | aynı yönetmen (Hayao Miyazaki) · ortak temalar: witch, anime · ortak türler: Fantasy, Animation |
| 2 | Ponyo (2008) | 0.71 | Ponyo (2008) | 0.71 | aynı yönetmen (Hayao Miyazaki) · ortak temalar: anime · ortak türler: Family, Fantasy, Animation |
| 3 | My Neighbor Totoro (1988) | 0.69 | Hotarubi no Mori e (2011) | 0.71 | ortak temalar: japanese mythology, spirit, anime · ortak türler: Fantasy, Animation |
| 4 | Kiki's Delivery Service (1989) | 0.67 | My Neighbor Totoro (1988) | 0.69 | aynı yönetmen (Hayao Miyazaki) · ortak temalar: anime · ortak türler: Family, Fantasy, Animation |
| 5 | Castle in the Sky (1986) | 0.66 | Mary and The Witch's Flower (2017) | 0.68 | ortak temalar: witch, magic, anime · ortak türler: Family, Fantasy, Animation |
| 6 | Patema Inverted (2013) | 0.65 | A Letter to Momo (2012) | 0.66 | ortak temalar: youkai, parent child relationship, anime · ortak türler: Family, Fantasy, Animation |
| 7 | Princess Mononoke (1997) | 0.65 | Children Who Chase Lost Voices (2011) | 0.62 | ortak temalar: spirit, anime · ortak türler: Family, Fantasy, Animation · ortak oyuncu: Miyu Irino |
| 8 | The Boy and the Heron (2023) | 0.64 | Little Witch Academia: The Enchanted Parade (2015) | 0.59 | ortak temalar: witch, magic, anime · ortak türler: Fantasy, Animation |
| 9 | The Tale of The Princess Kaguya (2013) | 0.64 | 🔑 Inuyasha the Movie 2: The Castle Beyond the Looking Glass (2002) | 0.58 | ortak temalar: youkai, anime · ortak türler: Fantasy, Animation |
| 10 | Child of the Stars (2020) | 0.64 | 🔑 Pom Poko (1994) | 0.55 | ortak temalar: japanese mythology, anime · ortak türler: Fantasy, Animation |
| 11 | Mary and The Witch's Flower (2017) | 0.63 | Weathering with You (2019) | 0.55 | ortak temalar: japanese mythology, magic, anime · ortak türler: Fantasy, Animation |
| 12 | Hotarubi no Mori e (2011) | 0.63 | Doraemon: Nobita and the Kingdom of Clouds (1992) | 0.55 | ortak temalar: anime · ortak türler: Family, Fantasy, Animation |
| 13 | Midori (1992) | 0.63 | Doraemon: Nobita's Great Adventure in the World of Magic (1984) | 0.55 | ortak temalar: anime · ortak türler: Family, Fantasy, Animation |
| 14 | Maquia: When the Promised Flower Blooms (2018) | 0.62 | The Tale of The Princess Kaguya (2013) | 0.54 | ortak temalar: anime · ortak türler: Fantasy, Animation |
| 15 | Ghost Cat Anzu (2024) | 0.62 | Coraline (2009) | 0.54 | ortak temalar: parallel world · ortak türler: Family, Fantasy, Animation |
| 16 | Mind Game (2004) | 0.62 | The Golden Bird (1987) | 0.54 | ortak temalar: witch, magic, anime · ortak türler: Family, Fantasy, Animation |
| 17 | House of Sayuri (2024) | 0.62 | The Secret World of Arrietty (2010) | 0.54 | ortak temalar: anime · ortak türler: Family, Fantasy, Animation |
| 18 | Drifting Home (2022) | 0.62 | 🔑 Inuyasha the Movie 3: Swords of an Honorable Ruler (2003) | 0.53 | ortak temalar: youkai, anime · ortak türler: Fantasy, Animation |
| 19 | House (1977) | 0.62 | Wolf Children (2012) | 0.53 | ortak temalar: anime · ortak türler: Family, Fantasy, Animation |
| 20 | Mirai (2018) | 0.62 | Ghost Cat Anzu (2024) | 0.53 | ortak temalar: anime · ortak türler: Family, Fantasy, Animation |

<details><summary>Bileşen debug (ağırlıklı katkılar)</summary>

| # | Film | cos | semantic | keyword | genre | director | cast | year | language | quality | ceza | FINAL |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Howl's Moving Castle (2004) | 0.72 | 0.40 | 0.05 | 0.08 | 0.06 | 0.00 | 0.03 | 0.03 | 0.07 | - | **0.71** |
| 2 | Ponyo (2008) | 0.71 | 0.38 | 0.02 | 0.12 | 0.06 | 0.00 | 0.02 | 0.03 | 0.07 | - | **0.71** |
| 3 | Hotarubi no Mori e (2011) | 0.63 | 0.31 | 0.20 | 0.08 | 0.00 | 0.00 | 0.02 | 0.03 | 0.06 | - | **0.71** |
| 4 | My Neighbor Totoro (1988) | 0.69 | 0.37 | 0.02 | 0.12 | 0.06 | 0.00 | 0.02 | 0.03 | 0.07 | - | **0.69** |
| 5 | Mary and The Witch's Flower (2017) | 0.63 | 0.31 | 0.16 | 0.11 | 0.00 | 0.00 | 0.01 | 0.03 | 0.05 | - | **0.68** |
| 6 | A Letter to Momo (2012) | 0.61 | 0.29 | 0.17 | 0.11 | 0.00 | 0.00 | 0.02 | 0.03 | 0.05 | - | **0.66** |
| 7 | Children Who Chase Lost Voices (2011) | 0.60 | 0.28 | 0.11 | 0.11 | 0.00 | 0.02 | 0.02 | 0.03 | 0.05 | - | **0.62** |
| 8 | Little Witch Academia: The Enchanted Parade (2015) | 0.58 | 0.25 | 0.17 | 0.08 | 0.00 | 0.00 | 0.02 | 0.03 | 0.04 | - | **0.59** |
| 9 | 🔑 Inuyasha the Movie 2: The Castle Beyond the Looking Glass (2002) | 0.52 | 0.20 | 0.20 | 0.07 | 0.00 | 0.00 | 0.03 | 0.03 | 0.05 | - | **0.58** |
| 10 | 🔑 Pom Poko (1994) | 0.53 | 0.21 | 0.16 | 0.08 | 0.00 | 0.00 | 0.02 | 0.03 | 0.06 | - | **0.55** |
| 11 | Weathering with You (2019) | 0.57 | 0.25 | 0.11 | 0.08 | 0.00 | 0.00 | 0.01 | 0.03 | 0.07 | - | **0.55** |
| 12 | Doraemon: Nobita and the Kingdom of Clouds (1992) | 0.55 | 0.22 | 0.12 | 0.12 | 0.00 | 0.00 | 0.02 | 0.03 | 0.03 | - | **0.55** |
| 13 | Doraemon: Nobita's Great Adventure in the World of Magic (1984) | 0.58 | 0.26 | 0.12 | 0.09 | 0.00 | 0.00 | 0.01 | 0.03 | 0.03 | - | **0.55** |
| 14 | The Tale of The Princess Kaguya (2013) | 0.64 | 0.32 | 0.03 | 0.09 | 0.00 | 0.00 | 0.02 | 0.03 | 0.06 | - | **0.54** |
| 15 | Coraline (2009) | 0.60 | 0.28 | 0.05 | 0.12 | 0.00 | 0.00 | 0.02 | 0.00 | 0.07 | - | **0.54** |
| 16 | The Golden Bird (1987) | 0.54 | 0.22 | 0.22 | 0.11 | 0.00 | 0.00 | 0.02 | 0.03 | 0.03 | lowVotes −0.08 | **0.54** |
| 17 | The Secret World of Arrietty (2010) | 0.60 | 0.27 | 0.03 | 0.12 | 0.00 | 0.00 | 0.02 | 0.03 | 0.06 | - | **0.54** |
| 18 | 🔑 Inuyasha the Movie 3: Swords of an Honorable Ruler (2003) | 0.47 | 0.15 | 0.20 | 0.08 | 0.00 | 0.00 | 0.03 | 0.03 | 0.05 | - | **0.53** |
| 19 | Wolf Children (2012) | 0.61 | 0.29 | 0.02 | 0.12 | 0.00 | 0.00 | 0.02 | 0.03 | 0.07 | - | **0.53** |
| 20 | Ghost Cat Anzu (2024) | 0.62 | 0.30 | 0.05 | 0.11 | 0.00 | 0.00 | 0.01 | 0.03 | 0.03 | - | **0.53** |

</details>

## Se7en (1995) — 807

Yönetmen: David Fincher · Türler: Crime, Mystery, Thriller · Oy: 22519

Keywords: rage and hate, police, s.w.a.t., sadism, self-fulfilling prophecy, psychopath, detective, investigation, insomnia, murder, serial killer, religion, shootout, corpse, seven deadly sins, depravity, neo-noir, urban gothic, anxious, disdainful, seven: los siete pecados capitales, assassino em série

| # | Saf semantic | cos | Hybrid rerank | final | neden |
|---|---|---|---|---|---|
| 1 | Judge (2013) | 0.64 | Insomnia (2002) | 0.73 | ortak temalar: insomnia, shootout, neo-noir · ortak türler: Crime, Thriller |
| 2 | The Killer (2023) | 0.63 | Zodiac (2007) | 0.70 | aynı yönetmen (David Fincher) · ortak temalar: investigation, serial killer, detective · ortak türler: Mystery, Crime, Thriller |
| 3 | The Devil's Advocate (1997) | 0.60 | Memories of Murder (2003) | 0.69 | ortak temalar: assassino em série, neo-noir, investigation · ortak türler: Crime, Thriller |
| 4 | Insomnia (2002) | 0.60 | The Crimson Rivers (2000) | 0.69 | ortak temalar: corpse, investigation, serial killer · ortak türler: Mystery, Crime, Thriller |
| 5 | The Usual Suspects (1995) | 0.59 | Citizen X (1995) | 0.67 | ortak temalar: assassino em série, corpse, investigation |
| 6 | Secret Window (2004) | 0.59 | Basic Instinct (1992) | 0.67 | ortak temalar: sadism, psychopath, neo-noir · ortak türler: Mystery, Thriller |
| 7 | Primal Fear (1996) | 0.58 | Manhunter (1986) | 0.67 | ortak temalar: depravity, psychopath, neo-noir · ortak türler: Crime, Thriller |
| 8 | Sinister (2012) | 0.58 | Gone Baby Gone (2007) | 0.67 | ortak temalar: anxious, neo-noir, detective · ortak türler: Mystery, Crime · ortak oyuncu: Morgan Freeman |
| 9 | Frenzy (1972) | 0.57 | The Silence of the Lambs (1991) | 0.66 | ortak temalar: assassino em série, psychopath, neo-noir · ortak türler: Crime, Thriller |
| 10 | Seven Pounds (2008) | 0.57 | Fight Club (1999) | 0.66 | aynı yönetmen (David Fincher) · ortak temalar: rage and hate, insomnia · ortak oyuncu: Brad Pitt |
| 11 | Memento (2000) | 0.57 | The Killer (2023) | 0.65 | aynı yönetmen (David Fincher) · ortak temalar: murder · ortak türler: Crime, Thriller |
| 12 | Heat (1995) | 0.57 | Resurrection (1999) | 0.65 | ortak temalar: psychopath, investigation, serial killer · ortak türler: Mystery, Crime |
| 13 | The Bone Collector (1999) | 0.56 | Frenzy (1972) | 0.63 | ortak temalar: assassino em série, serial killer, police · ortak türler: Crime, Thriller |
| 14 | Gone Girl (2014) | 0.56 | Mr. Brooks (2007) | 0.63 | ortak temalar: psychopath, investigation, serial killer · ortak türler: Crime, Thriller |
| 15 | Citizen X (1995) | 0.56 | L.A. Confidential (1997) | 0.63 | ortak temalar: corpse, neo-noir, detective · ortak türler: Mystery, Crime, Thriller |
| 16 | To Catch a Killer (2023) | 0.56 | The Devil's Advocate (1997) | 0.62 | ortak temalar: seven deadly sins, anxious |
| 17 | Manhunter (1986) | 0.56 | Secret Window (2004) | 0.62 | ortak temalar: detective, police, murder · ortak türler: Mystery, Thriller |
| 18 | Red Dragon (2002) | 0.56 | American Psycho (2000) | 0.62 | ortak temalar: assassino em série, psychopath, serial killer · ortak türler: Crime, Thriller |
| 19 | Basic Instinct (1992) | 0.56 | 🔑 Insomnia (1997) | 0.61 | ortak temalar: insomnia, shootout, neo-noir · ortak türler: Mystery, Crime, Thriller |
| 20 | Resurrection (1999) | 0.56 | Primal Fear (1996) | 0.61 | ortak temalar: psychopath · ortak türler: Mystery, Crime, Thriller |

<details><summary>Bileşen debug (ağırlıklı katkılar)</summary>

| # | Film | cos | semantic | keyword | genre | director | cast | year | language | quality | ceza | FINAL |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Insomnia (2002) | 0.60 | 0.35 | 0.18 | 0.08 | 0.00 | 0.00 | 0.02 | 0.03 | 0.06 | - | **0.73** |
| 2 | Zodiac (2007) | 0.55 | 0.30 | 0.10 | 0.12 | 0.06 | 0.00 | 0.02 | 0.03 | 0.07 | - | **0.70** |
| 3 | Memories of Murder (2003) | 0.52 | 0.27 | 0.25 | 0.08 | 0.00 | 0.00 | 0.02 | 0.00 | 0.07 | - | **0.69** |
| 4 | The Crimson Rivers (2000) | 0.55 | 0.31 | 0.18 | 0.12 | 0.00 | 0.00 | 0.02 | 0.00 | 0.06 | - | **0.69** |
| 5 | Citizen X (1995) | 0.56 | 0.31 | 0.19 | 0.06 | 0.00 | 0.00 | 0.03 | 0.03 | 0.05 | - | **0.67** |
| 6 | Basic Instinct (1992) | 0.56 | 0.31 | 0.14 | 0.10 | 0.00 | 0.00 | 0.03 | 0.03 | 0.06 | - | **0.67** |
| 7 | Manhunter (1986) | 0.56 | 0.31 | 0.18 | 0.07 | 0.00 | 0.00 | 0.02 | 0.03 | 0.06 | - | **0.67** |
| 8 | Gone Baby Gone (2007) | 0.54 | 0.29 | 0.15 | 0.10 | 0.00 | 0.02 | 0.02 | 0.03 | 0.06 | - | **0.67** |
| 9 | The Silence of the Lambs (1991) | 0.54 | 0.29 | 0.16 | 0.08 | 0.00 | 0.00 | 0.02 | 0.03 | 0.07 | - | **0.66** |
| 10 | Fight Club (1999) | 0.53 | 0.27 | 0.13 | 0.05 | 0.06 | 0.02 | 0.02 | 0.03 | 0.07 | - | **0.66** |
| 11 | The Killer (2023) | 0.63 | 0.39 | 0.01 | 0.09 | 0.06 | 0.00 | 0.01 | 0.03 | 0.06 | - | **0.65** |
| 12 | Resurrection (1999) | 0.56 | 0.31 | 0.16 | 0.09 | 0.00 | 0.00 | 0.02 | 0.03 | 0.04 | - | **0.65** |
| 13 | Frenzy (1972) | 0.57 | 0.33 | 0.14 | 0.07 | 0.00 | 0.00 | 0.01 | 0.03 | 0.05 | - | **0.63** |
| 14 | Mr. Brooks (2007) | 0.55 | 0.30 | 0.13 | 0.09 | 0.00 | 0.00 | 0.02 | 0.03 | 0.06 | - | **0.63** |
| 15 | L.A. Confidential (1997) | 0.53 | 0.28 | 0.10 | 0.12 | 0.00 | 0.00 | 0.03 | 0.03 | 0.07 | - | **0.63** |
| 16 | The Devil's Advocate (1997) | 0.60 | 0.36 | 0.09 | 0.06 | 0.00 | 0.00 | 0.03 | 0.03 | 0.07 | - | **0.62** |
| 17 | Secret Window (2004) | 0.59 | 0.34 | 0.07 | 0.10 | 0.00 | 0.00 | 0.02 | 0.03 | 0.06 | - | **0.62** |
| 18 | American Psycho (2000) | 0.56 | 0.31 | 0.10 | 0.08 | 0.00 | 0.00 | 0.02 | 0.03 | 0.07 | - | **0.62** |
| 19 | 🔑 Insomnia (1997) | 0.50 | 0.24 | 0.18 | 0.12 | 0.00 | 0.00 | 0.03 | 0.00 | 0.05 | - | **0.61** |
| 20 | Primal Fear (1996) | 0.58 | 0.34 | 0.03 | 0.12 | 0.00 | 0.00 | 0.03 | 0.03 | 0.07 | - | **0.61** |

</details>

## The Witch (2016) — 310131

Yönetmen: Robert Eggers · Türler: Horror, Fantasy, Drama · Oy: 7480

Keywords: witch, isolation, magic, possession, black magic, older woman seduces younger guy, new hampshire, woods, goat, puritan, religion, crying, false accusations, witchcraft, new england, praying, 17th century, folk horror, evil force, english colony, callous, foreboding

| # | Saf semantic | cos | Hybrid rerank | final | neden |
|---|---|---|---|---|---|
| 1 | Fear Street: 1666 (2021) | 0.66 | The Lighthouse (2019) | 0.78 | aynı yönetmen (Robert Eggers) · ortak temalar: new england, foreboding, isolation · ortak türler: Fantasy, Drama |
| 2 | The Witches (1990) | 0.66 | Fear Street: 1666 (2021) | 0.74 | ortak temalar: witchcraft, 17th century |
| 3 | The Lighthouse (2019) | 0.66 | Hansel & Gretel: Witch Hunters (2013) | 0.71 | ortak temalar: witchcraft, black magic, witch · ortak türler: Fantasy, Horror |
| 4 | Hereditary (2018) | 0.65 | Nosferatu (2024) | 0.70 | aynı yönetmen (Robert Eggers) · ortak temalar: possession · ortak türler: Fantasy, Horror |
| 5 | Witch Hunter (2024) | 0.65 | The Witches (1990) | 0.63 | ortak temalar: witch · ortak türler: Fantasy, Horror |
| 6 | Werwulf (2026) | 0.65 | Mother of Flies (2025) | 0.63 | ortak temalar: folk horror |
| 7 | The Ritual (2017) | 0.64 | Midsommar (2019) | 0.62 | ortak temalar: folk horror, foreboding · ortak türler: Horror, Drama |
| 8 | The Ritual (2025) | 0.64 | The Conjuring (2013) | 0.61 | ortak temalar: possession |
| 9 | The Woman in Black (2012) | 0.64 | The Ritual (2017) | 0.61 | ortak temalar: folk horror |
| 10 | The Conjuring (2013) | 0.64 | When Evil Lurks (2023) | 0.61 | ortak temalar: goat, possession |
| 11 | The Others (2001) | 0.64 | Weapons (2025) | 0.61 | ortak temalar: witchcraft, witch |
| 12 | Nosferatu (2024) | 0.63 | Hereditary (2018) | 0.60 | ortak temalar: possession |
| 13 | The Calling Witch (2026) | 0.63 | Beetlejuice Beetlejuice (2024) | 0.59 | ortak temalar: new england · ortak türler: Fantasy, Horror |
| 14 | Little Witches (1996) | 0.63 | Warlock (1989) | 0.59 | ortak temalar: witch, magic · ortak türler: Fantasy, Horror |
| 15 | Weapons (2025) | 0.62 | Suspiria (2018) | 0.59 | ortak temalar: witchcraft, foreboding · ortak türler: Horror, Drama |
| 16 | Last Kind Words (2012) | 0.62 | The Exorcism of God (2022) | 0.59 | ortak temalar: possession · ortak türler: Fantasy, Horror, Drama |
| 17 | Ghostland (2018) | 0.61 | Fear Street: 1978 (2021) | 0.58 | ortak temalar: witchcraft |
| 18 | Speak No Evil (2024) | 0.61 | Little Witches (1996) | 0.58 | ortak temalar: witch · ortak türler: Horror, Drama |
| 19 | The Beast Within (2024) | 0.61 | Keeper (2025) | 0.58 | ortak temalar: folk horror, woods |
| 20 | Midsommar (2019) | 0.61 | Hellboy: The Crooked Man (2024) | 0.58 | ortak temalar: witch · ortak türler: Fantasy, Horror |

<details><summary>Bileşen debug (ağırlıklı katkılar)</summary>

| # | Film | cos | semantic | keyword | genre | director | cast | year | language | quality | ceza | FINAL |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | The Lighthouse (2019) | 0.66 | 0.40 | 0.13 | 0.07 | 0.06 | 0.00 | 0.03 | 0.03 | 0.07 | - | **0.78** |
| 2 | Fear Street: 1666 (2021) | 0.66 | 0.40 | 0.17 | 0.05 | 0.00 | 0.00 | 0.02 | 0.03 | 0.06 | - | **0.74** |
| 3 | Hansel & Gretel: Witch Hunters (2013) | 0.61 | 0.36 | 0.14 | 0.10 | 0.00 | 0.00 | 0.03 | 0.03 | 0.06 | - | **0.71** |
| 4 | Nosferatu (2024) | 0.63 | 0.38 | 0.04 | 0.11 | 0.06 | 0.00 | 0.02 | 0.03 | 0.06 | - | **0.70** |
| 5 | The Witches (1990) | 0.66 | 0.40 | 0.05 | 0.09 | 0.00 | 0.00 | 0.01 | 0.03 | 0.06 | - | **0.63** |
| 6 | Mother of Flies (2025) | 0.60 | 0.35 | 0.22 | 0.08 | 0.00 | 0.00 | 0.02 | 0.03 | 0.01 | lowVotes −0.08 | **0.63** |
| 7 | Midsommar (2019) | 0.61 | 0.36 | 0.07 | 0.06 | 0.00 | 0.00 | 0.03 | 0.03 | 0.07 | - | **0.62** |
| 8 | The Conjuring (2013) | 0.64 | 0.38 | 0.04 | 0.06 | 0.00 | 0.00 | 0.03 | 0.03 | 0.07 | - | **0.61** |
| 9 | The Ritual (2017) | 0.64 | 0.39 | 0.05 | 0.05 | 0.00 | 0.00 | 0.03 | 0.03 | 0.06 | - | **0.61** |
| 10 | When Evil Lurks (2023) | 0.60 | 0.35 | 0.12 | 0.06 | 0.00 | 0.00 | 0.02 | 0.00 | 0.06 | - | **0.61** |
| 11 | Weapons (2025) | 0.62 | 0.37 | 0.07 | 0.05 | 0.00 | 0.00 | 0.02 | 0.03 | 0.06 | - | **0.61** |
| 12 | Hereditary (2018) | 0.65 | 0.40 | 0.03 | 0.04 | 0.00 | 0.00 | 0.03 | 0.03 | 0.07 | - | **0.60** |
| 13 | Beetlejuice Beetlejuice (2024) | 0.56 | 0.32 | 0.06 | 0.10 | 0.00 | 0.00 | 0.02 | 0.03 | 0.06 | - | **0.59** |
| 14 | Warlock (1989) | 0.55 | 0.31 | 0.09 | 0.10 | 0.00 | 0.00 | 0.01 | 0.03 | 0.04 | - | **0.59** |
| 15 | Suspiria (2018) | 0.58 | 0.34 | 0.07 | 0.06 | 0.00 | 0.00 | 0.03 | 0.03 | 0.06 | - | **0.59** |
| 16 | The Exorcism of God (2022) | 0.55 | 0.31 | 0.06 | 0.10 | 0.00 | 0.00 | 0.02 | 0.03 | 0.06 | - | **0.59** |
| 17 | Fear Street: 1978 (2021) | 0.57 | 0.33 | 0.09 | 0.05 | 0.00 | 0.00 | 0.02 | 0.03 | 0.06 | - | **0.58** |
| 18 | Little Witches (1996) | 0.63 | 0.38 | 0.05 | 0.09 | 0.00 | 0.00 | 0.01 | 0.03 | 0.02 | - | **0.58** |
| 19 | Keeper (2025) | 0.56 | 0.32 | 0.12 | 0.05 | 0.00 | 0.00 | 0.02 | 0.03 | 0.03 | - | **0.58** |
| 20 | Hellboy: The Crooked Man (2024) | 0.56 | 0.32 | 0.07 | 0.10 | 0.00 | 0.00 | 0.02 | 0.03 | 0.04 | - | **0.58** |

</details>

## Interstellar (2014) — 157336

Yönetmen: Christopher Nolan · Türler: Adventure, Drama, Science Fiction · Oy: 38706

Keywords: rescue, future, spacecraft, race against time, artificial intelligence (a.i.), nasa, time warp, dystopia, expedition, space travel, wormhole, famine, hibernation, black hole, quantum mechanics, family relationships, space, robot, astronaut, scientist, single father, farmer, space station, space adventure, time paradox, cryonics, father daughter relationship, 2060s, cornfield, time manipulation

| # | Saf semantic | cos | Hybrid rerank | final | neden |
|---|---|---|---|---|---|
| 1 | Prometheus (2012) | 0.64 | Passengers (2016) | 0.82 | ortak temalar: hibernation, cryonics, space station · ortak türler: Science Fiction, Drama |
| 2 | Passengers (2016) | 0.64 | The Martian (2015) | 0.77 | ortak temalar: nasa, astronaut, spacecraft · ortak türler: Science Fiction, Adventure, Drama · ortak oyuncu: Jessica Chastain |
| 3 | Arrival (2016) | 0.64 | Red Planet (2000) | 0.74 | ortak temalar: space adventure, astronaut, robot |
| 4 | Inception (2010) | 0.63 | Gravity (2013) | 0.71 | ortak temalar: space station, astronaut, space · ortak türler: Science Fiction, Drama |
| 5 | Event Horizon (1997) | 0.63 | Inception (2010) | 0.70 | aynı yönetmen (Christopher Nolan) · ortak temalar: rescue · ortak türler: Science Fiction, Adventure |
| 6 | The Tomorrow War (2021) | 0.62 | Armageddon (1998) | 0.70 | ortak temalar: nasa, race against time, astronaut · ortak türler: Science Fiction, Adventure |
| 7 | The Martian (2015) | 0.62 | 🔑 Stargate: The Ark of Truth (2008) | 0.70 | ortak temalar: wormhole, space travel, spacecraft · ortak türler: Science Fiction, Adventure |
| 8 | Children of Men (2006) | 0.61 | Oblivion (2013) | 0.70 | ortak temalar: spacecraft, space, dystopia · ortak türler: Science Fiction, Adventure |
| 9 | Armageddon (1998) | 0.61 | The Creator (2023) | 0.69 | ortak temalar: space station, artificial intelligence (a.i.), robot · ortak türler: Science Fiction, Adventure |
| 10 | Sunshine (2007) | 0.61 | Alien: Covenant (2017) | 0.69 | ortak temalar: space travel, spacecraft, space |
| 11 | Project Hail Mary (2026) | 0.61 | Arrival (2016) | 0.69 | ortak temalar: time manipulation, spacecraft, scientist · ortak türler: Science Fiction, Drama |
| 12 | WALL·E (2008) | 0.61 | Star Trek Into Darkness (2013) | 0.68 | ortak temalar: spacecraft, space · ortak türler: Science Fiction, Adventure |
| 13 | Good Luck, Have Fun, Don't Die (2026) | 0.61 | Guardians of the Galaxy (2014) | 0.66 | ortak temalar: spacecraft, space · ortak türler: Science Fiction, Adventure |
| 14 | Oblivion (2013) | 0.61 | 2001: A Space Odyssey (1968) | 0.66 | ortak temalar: space station, astronaut, space travel · ortak türler: Science Fiction, Adventure |
| 15 | Tenet (2020) | 0.61 | Elysium (2013) | 0.66 | ortak temalar: space station, future, dystopia · ortak türler: Science Fiction, Drama |
| 16 | Alien (1979) | 0.60 | Terminator Genisys (2015) | 0.66 | ortak temalar: artificial intelligence (a.i.), robot, future · ortak türler: Science Fiction, Adventure |
| 17 | Alien: Covenant (2017) | 0.60 | The Space Between Us (2017) | 0.66 | ortak temalar: scientist, future · ortak türler: Science Fiction, Adventure, Drama |
| 18 | Transcendence (2014) | 0.60 | Alien (1979) | 0.66 | ortak temalar: space travel, spacecraft, space |
| 19 | Red Planet (2000) | 0.60 | Tenet (2020) | 0.65 | aynı yönetmen (Christopher Nolan) · ortak temalar: time paradox |
| 20 | Star Trek Into Darkness (2013) | 0.60 | Moon (2009) | 0.65 | ortak temalar: space, artificial intelligence (a.i.), future · ortak türler: Science Fiction, Drama |

<details><summary>Bileşen debug (ağırlıklı katkılar)</summary>

| # | Film | cos | semantic | keyword | genre | director | cast | year | language | quality | ceza | FINAL |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Passengers (2016) | 0.64 | 0.40 | 0.22 | 0.08 | 0.00 | 0.00 | 0.03 | 0.03 | 0.07 | - | **0.82** |
| 2 | The Martian (2015) | 0.62 | 0.37 | 0.13 | 0.12 | 0.00 | 0.02 | 0.03 | 0.03 | 0.07 | - | **0.77** |
| 3 | Red Planet (2000) | 0.60 | 0.36 | 0.23 | 0.06 | 0.00 | 0.00 | 0.02 | 0.03 | 0.05 | - | **0.74** |
| 4 | Gravity (2013) | 0.60 | 0.36 | 0.15 | 0.08 | 0.00 | 0.00 | 0.03 | 0.03 | 0.07 | - | **0.71** |
| 5 | Inception (2010) | 0.63 | 0.39 | 0.03 | 0.10 | 0.06 | 0.00 | 0.02 | 0.03 | 0.07 | - | **0.70** |
| 6 | Armageddon (1998) | 0.61 | 0.37 | 0.13 | 0.09 | 0.00 | 0.00 | 0.01 | 0.03 | 0.06 | - | **0.70** |
| 7 | 🔑 Stargate: The Ark of Truth (2008) | 0.48 | 0.25 | 0.25 | 0.10 | 0.00 | 0.00 | 0.02 | 0.03 | 0.05 | - | **0.70** |
| 8 | Oblivion (2013) | 0.61 | 0.37 | 0.13 | 0.08 | 0.00 | 0.00 | 0.03 | 0.03 | 0.07 | - | **0.70** |
| 9 | The Creator (2023) | 0.59 | 0.35 | 0.13 | 0.10 | 0.00 | 0.00 | 0.02 | 0.03 | 0.06 | - | **0.69** |
| 10 | Alien: Covenant (2017) | 0.60 | 0.36 | 0.15 | 0.05 | 0.00 | 0.00 | 0.03 | 0.03 | 0.06 | - | **0.69** |
| 11 | Arrival (2016) | 0.64 | 0.40 | 0.09 | 0.07 | 0.00 | 0.00 | 0.03 | 0.03 | 0.07 | - | **0.69** |
| 12 | Star Trek Into Darkness (2013) | 0.60 | 0.36 | 0.09 | 0.10 | 0.00 | 0.00 | 0.03 | 0.03 | 0.07 | - | **0.68** |
| 13 | Guardians of the Galaxy (2014) | 0.55 | 0.32 | 0.11 | 0.10 | 0.00 | 0.00 | 0.03 | 0.03 | 0.07 | - | **0.66** |
| 14 | 2001: A Space Odyssey (1968) | 0.57 | 0.34 | 0.13 | 0.09 | 0.00 | 0.00 | 0.00 | 0.03 | 0.07 | - | **0.66** |
| 15 | Elysium (2013) | 0.59 | 0.35 | 0.12 | 0.07 | 0.00 | 0.00 | 0.03 | 0.03 | 0.06 | - | **0.66** |
| 16 | Terminator Genisys (2015) | 0.52 | 0.29 | 0.16 | 0.09 | 0.00 | 0.00 | 0.03 | 0.03 | 0.06 | - | **0.66** |
| 17 | The Space Between Us (2017) | 0.58 | 0.34 | 0.09 | 0.11 | 0.00 | 0.00 | 0.03 | 0.03 | 0.06 | - | **0.66** |
| 18 | Alien (1979) | 0.60 | 0.36 | 0.12 | 0.06 | 0.00 | 0.00 | 0.01 | 0.03 | 0.07 | - | **0.66** |
| 19 | Tenet (2020) | 0.61 | 0.37 | 0.05 | 0.06 | 0.06 | 0.00 | 0.02 | 0.03 | 0.07 | - | **0.65** |
| 20 | Moon (2009) | 0.54 | 0.31 | 0.13 | 0.09 | 0.00 | 0.00 | 0.02 | 0.03 | 0.07 | - | **0.65** |

</details>

## Balzac and the Little Chinese Seamstress (2002) — 2111

Yönetmen: Dai Sijie · Türler: Drama · Oy: 71

Keywords: china, love of one's life, balzac, 1970s, violin, mountain village, cultural revolution, dressmaker, based on memoir or autobiography, sichuan

| # | Saf semantic | cos | Hybrid rerank | final | neden |
|---|---|---|---|---|---|
| 1 | Keep Cool (1997) | 0.63 | In the Heat of the Sun (1995) | 0.70 | ortak temalar: cultural revolution, 1970s |
| 2 | Under the Hawthorn Tree (2010) | 0.62 | Farewell My Concubine (1993) | 0.69 | ortak temalar: cultural revolution, china |
| 3 | To Live (1994) | 0.62 | To Live (1994) | 0.68 | ortak temalar: cultural revolution, china |
| 4 | Shanghai Dreams (2005) | 0.62 | The Blue Kite (1994) | 0.64 | ortak temalar: china |
| 5 | Shanghai Triad (1995) | 0.62 | Comrades, Almost a Love Story (1996) | 0.63 | ortak temalar: china |
| 6 | Xiu Xiu: The Sent-Down Girl (1998) | 0.61 | 🔑 Traitors (1980) | 0.62 | ortak temalar: cultural revolution |
| 7 | Wild Chrysanthemum (1982) | 0.61 | Youth (2017) | 0.61 | ortak temalar: cultural revolution |
| 8 | One Second (2020) | 0.61 | Xiu Xiu: The Sent-Down Girl (1998) | 0.59 | hikâye ve atmosfer benzerliği |
| 9 | A Summer Trip (2021) | 0.61 | The King of Masks (1995) | 0.59 | ortak temalar: china |
| 10 | The Lover (1992) | 0.61 | Raise the Red Lantern (1991) | 0.59 | hikâye ve atmosfer benzerliği |
| 11 | Romance of a Calligrapher (1982) | 0.60 | Mountain Cry (2016) | 0.59 | ortak temalar: china |
| 12 | The Herdsman (1982) | 0.60 | Not One Less (1999) | 0.58 | hikâye ve atmosfer benzerliği |
| 13 | Baober in Love (2004) | 0.60 | 🔑 Electric Shadows (2005) | 0.57 | ortak temalar: china |
| 14 | Red Sorghum (1988) | 0.60 | 🔑 Blind Shaft (2003) | 0.57 | ortak temalar: china · ortak oyuncu: Wang Shuangbao |
| 15 | Raise the Red Lantern (1991) | 0.59 | A Touch of Sin (2013) | 0.56 | ortak temalar: china |
| 16 | Shanghai Story (2004) | 0.59 | Still Life (2006) | 0.55 | ortak temalar: china |
| 17 | A Touch of Sin (2013) | 0.59 | Pickpocket (1997) | 0.55 | hikâye ve atmosfer benzerliği |
| 18 | Unknown Pleasures (2002) | 0.59 | 🔑 The Message (2009) | 0.54 | ortak temalar: china · ortak oyuncu: Zhou Xun |
| 19 | The Twin Bracelets (1991) | 0.59 | Taipei Story (1985) | 0.54 | hikâye ve atmosfer benzerliği |
| 20 | Lost in Beijing (2007) | 0.59 | Suzhou River (2000) | 0.54 | ortak oyuncu: Zhou Xun |

<details><summary>Bileşen debug (ağırlıklı katkılar)</summary>

| # | Film | cos | semantic | keyword | genre | director | cast | year | language | quality | ceza | FINAL |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | In the Heat of the Sun (1995) | 0.58 | 0.35 | 0.19 | 0.06 | 0.00 | 0.00 | 0.02 | 0.03 | 0.05 | - | **0.70** |
| 2 | Farewell My Concubine (1993) | 0.57 | 0.34 | 0.12 | 0.12 | 0.00 | 0.00 | 0.02 | 0.03 | 0.06 | - | **0.69** |
| 3 | To Live (1994) | 0.62 | 0.39 | 0.14 | 0.04 | 0.00 | 0.00 | 0.02 | 0.03 | 0.05 | - | **0.68** |
| 4 | The Blue Kite (1994) | 0.58 | 0.35 | 0.08 | 0.12 | 0.00 | 0.00 | 0.02 | 0.03 | 0.04 | - | **0.64** |
| 5 | Comrades, Almost a Love Story (1996) | 0.58 | 0.35 | 0.15 | 0.06 | 0.00 | 0.00 | 0.02 | 0.00 | 0.05 | - | **0.63** |
| 6 | 🔑 Traitors (1980) | 0.52 | 0.29 | 0.25 | 0.12 | 0.00 | 0.00 | 0.01 | 0.03 | 0.00 | lowVotes −0.08 | **0.62** |
| 7 | Youth (2017) | 0.59 | 0.36 | 0.13 | 0.03 | 0.00 | 0.00 | 0.01 | 0.03 | 0.04 | - | **0.61** |
| 8 | Xiu Xiu: The Sent-Down Girl (1998) | 0.61 | 0.38 | 0.00 | 0.12 | 0.00 | 0.00 | 0.02 | 0.03 | 0.04 | - | **0.59** |
| 9 | The King of Masks (1995) | 0.53 | 0.31 | 0.08 | 0.12 | 0.00 | 0.00 | 0.02 | 0.03 | 0.04 | - | **0.59** |
| 10 | Raise the Red Lantern (1991) | 0.59 | 0.37 | 0.00 | 0.12 | 0.00 | 0.00 | 0.02 | 0.03 | 0.06 | - | **0.59** |
| 11 | Mountain Cry (2016) | 0.56 | 0.33 | 0.19 | 0.06 | 0.00 | 0.00 | 0.02 | 0.03 | 0.03 | lowVotes −0.08 | **0.59** |
| 12 | Not One Less (1999) | 0.59 | 0.36 | 0.00 | 0.12 | 0.00 | 0.00 | 0.03 | 0.03 | 0.05 | - | **0.58** |
| 13 | 🔑 Electric Shadows (2005) | 0.50 | 0.28 | 0.16 | 0.05 | 0.00 | 0.00 | 0.03 | 0.03 | 0.03 | - | **0.57** |
| 14 | 🔑 Blind Shaft (2003) | 0.53 | 0.31 | 0.09 | 0.06 | 0.00 | 0.02 | 0.03 | 0.03 | 0.04 | - | **0.57** |
| 15 | A Touch of Sin (2013) | 0.59 | 0.36 | 0.04 | 0.06 | 0.00 | 0.00 | 0.02 | 0.03 | 0.05 | - | **0.56** |
| 16 | Still Life (2006) | 0.56 | 0.33 | 0.06 | 0.06 | 0.00 | 0.00 | 0.02 | 0.03 | 0.05 | - | **0.55** |
| 17 | Pickpocket (1997) | 0.56 | 0.33 | 0.00 | 0.12 | 0.00 | 0.00 | 0.02 | 0.03 | 0.04 | - | **0.55** |
| 18 | 🔑 The Message (2009) | 0.52 | 0.29 | 0.08 | 0.06 | 0.00 | 0.02 | 0.02 | 0.03 | 0.04 | - | **0.54** |
| 19 | Taipei Story (1985) | 0.56 | 0.33 | 0.00 | 0.12 | 0.00 | 0.00 | 0.01 | 0.03 | 0.05 | - | **0.54** |
| 20 | Suzhou River (2000) | 0.58 | 0.35 | 0.00 | 0.06 | 0.00 | 0.02 | 0.03 | 0.03 | 0.04 | - | **0.54** |

</details>
