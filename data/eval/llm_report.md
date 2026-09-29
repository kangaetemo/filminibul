# LLM Değerlendirme Raporu

Oluşturulma: 2026-09-29T09:28:34.001Z · hakem: gpt-4.1 · embedding: v3 · 50 seed · Top 10

- **nDCG@10**: sıralama kalitesi (1.00 = puanlanan en iyi filmler en üstte)
- **ort. puan**: Top 10'un ortalama 0–3 puanı
- **iyi**: puanı ≥2 olanların oranı · **alakasız**: puanı 0 olanların oranı

| Sıralama | nDCG@10 | ort. puan | iyi | alakasız | nDCG popüler | nDCG orta | nDCG az bilinen |
|---|---|---|---|---|---|---|---|
| semantic | **0.80** | 2.02 | 75% | 3% | 0.85 | 0.75 | 0.79 |
| heavy | **0.78** | 1.96 | 74% | 3% | 0.78 | 0.78 | 0.77 |
| full | **0.82** | 2.07 | 80% | 2% | 0.85 | 0.79 | 0.81 |
| semPen | **0.81** | 2.03 | 77% | 2% | 0.84 | 0.77 | 0.80 |
| light | **0.82** | 2.07 | 79% | 2% | 0.85 | 0.79 | 0.81 |
| lightNoRec | **0.82** | 2.07 | 80% | 2% | 0.85 | 0.79 | 0.81 |
| lightQ | **0.82** | 2.07 | 80% | 2% | 0.84 | 0.80 | 0.82 |

## Seed bazında nDCG@10

| Seed | katman | semantic | heavy | full | semPen | light | lightNoRec | lightQ |
|---|---|---|---|---|---|---|---|---|
| The Matrix (1999) | popüler | 0.97 | 0.94 | 0.91 | 0.96 | 0.92 | 0.91 | 0.92 |
| Triangle (2009) | orta | 0.58 | 0.65 | 0.60 | 0.57 | 0.60 | 0.60 | 0.59 |
| Coherence (2014) | popüler | 0.70 | 0.45 | 0.74 | 0.74 | 0.74 | 0.74 | 0.76 |
| Spirited Away (2001) | popüler | 0.79 | 0.72 | 0.79 | 0.79 | 0.84 | 0.79 | 0.79 |
| Se7en (1995) | popüler | 0.89 | 0.77 | 0.89 | 0.89 | 0.89 | 0.89 | 0.87 |
| The Witch (2016) | popüler | 0.75 | 0.60 | 0.79 | 0.77 | 0.79 | 0.79 | 0.69 |
| Interstellar (2014) | popüler | 0.69 | 0.64 | 0.69 | 0.68 | 0.69 | 0.69 | 0.68 |
| Balzac and the Little Chinese Seamstress (2002) | az bilinen | 0.48 | 0.72 | 0.61 | 0.56 | 0.60 | 0.61 | 0.60 |
| Heavenly Creatures (1994) | orta | 0.50 | 0.70 | 0.55 | 0.50 | 0.55 | 0.55 | 0.55 |
| Stagecoach (1939) | orta | 0.86 | 0.95 | 0.91 | 0.90 | 0.91 | 0.91 | 0.95 |
| Happy Flight (2008) | az bilinen | 0.93 | 0.90 | 0.96 | 0.96 | 0.96 | 0.96 | 0.96 |
| Beauty and the Beast (2017) | popüler | 0.87 | 0.78 | 0.86 | 0.86 | 0.85 | 0.86 | 0.85 |
| Monster High: Electrified (2017) | az bilinen | 0.91 | 0.86 | 0.90 | 0.90 | 0.90 | 0.90 | 0.92 |
| Society (1989) | orta | 0.60 | 0.78 | 0.61 | 0.61 | 0.61 | 0.61 | 0.60 |
| The Babadook (2014) | popüler | 0.84 | 0.69 | 0.85 | 0.84 | 0.85 | 0.85 | 0.83 |
| Ulysses' Gaze (1995) | az bilinen | 0.96 | 0.86 | 0.95 | 0.95 | 0.95 | 0.95 | 0.95 |
| Fifty Shades of Grey (2015) | popüler | 0.91 | 0.80 | 0.92 | 0.92 | 0.92 | 0.92 | 0.92 |
| A Shaun the Sheep Movie: Farmageddon (2019) | orta | 0.94 | 0.88 | 1.00 | 0.97 | 0.97 | 1.00 | 1.00 |
| Black Cat, White Cat (1998) | orta | 0.88 | 0.94 | 0.91 | 0.88 | 0.91 | 0.91 | 0.93 |
| Secret Sunshine (2007) | az bilinen | 0.48 | 0.85 | 0.61 | 0.57 | 0.61 | 0.61 | 0.63 |
| Shell (2025) | az bilinen | 0.77 | 0.65 | 0.89 | 0.85 | 0.89 | 0.89 | 0.90 |
| Jackass Number Two (2006) | orta | 0.63 | 0.83 | 0.63 | 0.62 | 0.63 | 0.63 | 0.63 |
| My American Uncle (1980) | az bilinen | 0.86 | 0.70 | 0.96 | 0.92 | 0.96 | 0.96 | 0.97 |
| Avengers: Infinity War (2018) | popüler | 0.99 | 0.95 | 0.99 | 0.99 | 0.99 | 0.99 | 0.99 |
| Close Encounters of the Third Kind (1977) | popüler | 0.86 | 0.76 | 0.80 | 0.80 | 0.81 | 0.80 | 0.76 |
| A Mermaid's Tale (2017) | az bilinen | 0.79 | 0.87 | 0.73 | 0.73 | 0.75 | 0.73 | 0.75 |
| The Devil's Path (2013) | az bilinen | 0.89 | 0.76 | 0.84 | 0.89 | 0.83 | 0.84 | 0.82 |
| The Nightingale (2018) | orta | 0.74 | 0.88 | 0.77 | 0.74 | 0.80 | 0.77 | 0.80 |
| Teke Teke (2009) | az bilinen | 0.77 | 0.75 | 0.82 | 0.77 | 0.82 | 0.82 | 0.82 |
| Big Man Japan (2007) | az bilinen | 0.84 | 0.69 | 0.94 | 0.93 | 0.94 | 0.94 | 0.94 |
| The Ministry of Ungentlemanly Warfare (2024) | orta | 0.76 | 0.68 | 0.75 | 0.76 | 0.76 | 0.75 | 0.76 |
| Guardians of the Galaxy (2014) | popüler | 0.99 | 0.86 | 0.97 | 0.99 | 0.96 | 0.97 | 0.96 |
| Doraemon: Nobita and the Green Giant Legend (2008) | az bilinen | 0.90 | 0.67 | 0.73 | 0.73 | 0.73 | 0.73 | 0.73 |
| Dog Bite Dog (2006) | az bilinen | 0.67 | 0.69 | 0.61 | 0.60 | 0.59 | 0.61 | 0.61 |
| Brother Bear (2003) | popüler | 0.79 | 0.84 | 0.76 | 0.79 | 0.79 | 0.76 | 0.77 |
| Minuscule: Valley of the Lost Ants (2013) | orta | 0.74 | 0.90 | 0.80 | 0.79 | 0.80 | 0.80 | 0.79 |
| Rudolph the Red-Nosed Reindeer (1964) | orta | 0.94 | 0.97 | 0.97 | 0.97 | 0.97 | 0.97 | 0.97 |
| Dolores Claiborne (1995) | orta | 0.56 | 0.43 | 0.55 | 0.56 | 0.55 | 0.55 | 0.52 |
| No Time to Die (2021) | popüler | 0.84 | 0.88 | 0.86 | 0.79 | 0.79 | 0.86 | 0.86 |
| What We Do in the Shadows (2014) | popüler | 0.80 | 0.69 | 0.83 | 0.82 | 0.83 | 0.83 | 0.85 |
| Babygirl (2024) | orta | 0.95 | 0.68 | 0.95 | 0.96 | 0.95 | 0.95 | 0.95 |
| Miracles from Heaven (2016) | orta | 0.84 | 0.75 | 0.85 | 0.85 | 0.85 | 0.85 | 0.85 |
| The Public Enemy (1931) | orta | 0.88 | 0.87 | 0.92 | 0.88 | 0.91 | 0.92 | 0.92 |
| The Hunger Games (2012) | popüler | 1.00 | 0.90 | 1.00 | 1.00 | 1.00 | 1.00 | 0.99 |
| The Grand Budapest Hotel (2014) | popüler | 0.84 | 0.69 | 0.91 | 0.87 | 0.91 | 0.91 | 0.93 |
| Spread Your Wings (2019) | orta | 0.80 | 0.87 | 0.83 | 0.83 | 0.83 | 0.83 | 0.83 |
| Rise of the Planet of the Apes (2011) | popüler | 0.92 | 0.99 | 0.97 | 0.92 | 0.97 | 0.97 | 0.97 |
| Three Wishes for Cinderella (1973) | orta | 0.54 | 0.51 | 0.77 | 0.75 | 0.77 | 0.77 | 0.91 |
| Dunkirk (2017) | popüler | 0.81 | 0.92 | 0.84 | 0.81 | 0.81 | 0.84 | 0.81 |
| Barbarian (2022) | popüler | 0.67 | 0.63 | 0.66 | 0.65 | 0.66 | 0.66 | 0.68 |

## "full" Top 10 (LLM puanlarıyla)

- **The Matrix (1999)**: The Matrix Reloaded [3], The Matrix Revolutions [3], The Matrix Resurrections [3], Equilibrium [2], The Thirteenth Floor [3], The Terminator [2], Ghost in the Shell [2], Tron [2], TRON: Ares [1], The Creator [2]
- **Triangle (2009)**: Pacific Fear [2], Beneath the Surface [2], Not Without Hope [1], The Woman in Cabin 10 [2], The Evil Below [2], I Know What You Did Last Summer [1], The Tank [1], Lost Things [2], Iron Lung [1], Speak No Evil [2]
- **Coherence (2014)**: Feast of Burden [2], House of Demons [2], Bokeh [2], Project Ithaca [1], Companion [3], Dark City [2], Knowing [1], Bugonia [1], Leave the World Behind [2], True Love [2]
- **Spirited Away (2001)**: My Neighbor Totoro [2], Howl's Moving Castle [3], Kiki's Delivery Service [2], Ponyo [2], A Letter to Momo [2], Castle in the Sky [2], Mr. Dough and the Egg Princess [3], Mei and the Kittenbus [2], Princess Mononoke [2], When Marnie Was There [2]
- **Se7en (1995)**: Zodiac [3], Copycat [3], The Game [1], Resurrection [3], The Little Things [3], The Girl with the Dragon Tattoo [3], Gone Girl [2], To Catch a Killer [3], Memories of Murder [3], Citizen X [2]
- **The Witch (2016)**: Hereditary [2], The Lighthouse [2], Werwulf [3], Fear Street: 1666 [2], Nosferatu [2], Midsommar [2], Rabbit Trap [2], Mother of Flies [3], Speak No Evil [1], The Wicker Man [3]
- **Interstellar (2014)**: Gravity [2], Passengers [2], Inception [2], The Martian [3], Prometheus [2], Sunshine [3], Project Hail Mary [3], Transcendence [1], Arrival [2], 2001: A Space Odyssey [3]
- **Balzac and the Little Chinese Seamstress (2002)**: Coming Home [2], Night Peacock [1], Farewell My Concubine [2], A Soul Haunted by Painting [1], To Live [2], Under the Hawthorn Tree [3], In the Heat of the Sun [2], Red Sorghum [1], The Road Home [2], Shanghai Dreams [2]
- **Heavenly Creatures (1994)**: The Lovely Bones [2], The Piano [2], Once Were Warriors [1], Passionless Moments [0], Bright Star [2], Boy [1], Jane Eyre [1], Whale Rider [1], Tuesday [2], The Hours [2]
- **Stagecoach (1939)**: She Wore a Yellow Ribbon [2], My Darling Clementine [2], The Man Who Shot Liberty Valance [2], The Searchers [2], Fort Apache [2], How the West Was Won [2], 3:10 to Yuma [2], Gunfight at the O.K. Corral [1], High Noon [2], Winchester '73 [1]
- **Happy Flight (2008)**: Fasten Your Seatbelt [3], Cheap Flight!! [3], Flying Rabbits [2], Crash Landing [2], Airplane! [2], The Unbroken [1], Climber's High [2], Emergency Declaration [2], Limit of Love: Umizaru [2], The Captain [2]
- **Beauty and the Beast (2017)**: Beauty and the Beast [3], Beauty and the Beast [3], Maleficent [2], Cinderella [3], Enchanted [2], Maleficent: Mistress of Evil [2], EverAfter [2], Aladdin [3], Stardust [2], The Little Mermaid [3]
- **Monster High: Electrified (2017)**: Hotel Transylvania: Transformania [3], Hotel Transylvania [3], Barbie: A Fashion Fairytale [1], Hotel Transylvania 2 [3], Hotel Transylvania 3: Summer Vacation [3], Barbie in A Mermaid Tale 2 [1], Monster House [1], Monsters vs Aliens [1], Barbie: The Pearl Princess [2], Barbie: Princess Charm School [2]
- **Society (1989)**: Re-Animator [2], Deep Murder [2], Teenage Exorcist [2], Scary Movie [1], Beneath Still Waters [2], Cruel World [1], The Unnamable [1], Jennifer's Body [2], The Return of the Living Dead [1], The Beast Within [2]
- **The Babadook (2014)**: Bring Her Back [2], Hereditary [3], The Lullaby [3], The Beldham [3], The Nightingale [1], Ghostland [2], Sleepwalker [3], The Orphanage [3], The Pact [2], mother! [2]
- **Ulysses' Gaze (1995)**: Voyage to Cythera [3], The Suspended Step of the Stork [3], The Dust of Time [3], Alexander the Great [3], Eternity and a Day [3], Landscape in the Mist [3], The King [1], All of us, efendi [2], Towards Freedom [2], Borderline [1]
- **Fifty Shades of Grey (2015)**: Fifty Shades Freed [3], Fifty Shades Darker [3], After [2], Nine 1/2 Weeks [3], Nocturnal Animals [0], Unfaithful [2], Babygirl [2], It Ends with Us [2], Secretary [3], After We Collided [2]
- **A Shaun the Sheep Movie: Farmageddon (2019)**: Shaun the Sheep Movie [3], A Close Shave [3], Chicken Run: Dawn of the Nugget [2], A Grand Day Out [2], Chicken Run [2], Wallace & Gromit: Vengeance Most Fowl [2], Lifted [2], Wallace & Gromit: The Curse of the Were-Rabbit [2], Ron's Gone Wrong [2], Planet 51 [2]
- **Black Cat, White Cat (1998)**: Time of the Gypsies [3], Underground [3], Arizona Dream [2], The Wounds [2], It Will Not End [2], Picnic in Topola [2], Cirkus Columbia [1], What Are You Doing Tonight? [1], We Are Not Angels [2], Boulevard of the Revolution [1]
- **Secret Sunshine (2007)**: The Cruel Story of a Woman Who Spins and Spins the Wheel [1], Festival [2], Gilsodom [2], Invited Heroes [1], Oh My Love Part II [2], Maborosi [3], Poetry [3], Weeds [2], A Girl at My Door [2], Oasis [2]
- **Shell (2025)**: Wake [3], Succubus [2], Strange Darling [1], Barbarian [2], Bone Lake [2], MaXXXine [2], Swallow [3], The Caul [2], Smile 2 [2], Fear of Rain [2]
- **Jackass Number Two (2006)**: Crank: High Voltage [2], Tropic Thunder [2], xXx: Return of Xander Cage [1], Horrible Bosses 2 [1], The Hangover Part II [1], And Now for Something Completely Different [3], The Hangover Part III [1], American Reunion [1], Showtime [1], This Is America Part 2 [1]
- **My American Uncle (1980)**: No Smoking [3], Last Year at Marienbad [2], Masculin Féminin [2], My Night at Maud's [2], Bed and Board [2], Stolen Kisses [2], Hiroshima Mon Amour [2], Heat of Desire [1], Three Colors: White [2], Venus Beauty Institute [2]
- **Avengers: Infinity War (2018)**: Avengers: Endgame [3], Avengers: Age of Ultron [3], Captain America: Civil War [2], The Avengers [3], Avengers: Secret Wars [2], Guardians of the Galaxy [2], Guardians of the Galaxy Vol. 3 [2], Guardians of the Galaxy Vol. 2 [2], Captain America: The Winter Soldier [2], Captain Marvel [2]
- **Close Encounters of the Third Kind (1977)**: E.T. the Extra-Terrestrial [2], Disclosure Day [3], War of the Worlds [2], Contact [3], The Day the Earth Stood Still [3], Signs [2], Independence Day [1], Arrival [3], Proximity [3], Critters [0]
- **A Mermaid's Tale (2017)**: Ruby Gillman, Teenage Kraken [2], Barbie in A Mermaid Tale 2 [3], Four Kids and It [2], Dolphin Tale [2], Barbie in A Mermaid Tale [3], The King's Daughter [2], The Little Mermaid [3], Dolphin Tale 2 [2], The Adventures of Sharkboy and Lavagirl [2], The Last Song [1]
- **The Devil's Path (2013)**: My Friend "A" [3], Traces of Sin [3], The Serialist [3], Shield of Straw [2], Villain [1], Character [2], The Journalist [2], UNFAIR: the answer [1], Pink and Gray [1], The Blood of Wolves [2]
- **The Nightingale (2018)**: The Proposition [3], Rabbit-Proof Fence [2], The Babadook [1], Mystery Road [2], Brimstone [3], The Revenant [3], Ten Canoes [1], The Rover [1], The Dry [1], Walkabout [1]
- **Teke Teke (2009)**: Carved: The Slit-Mouthed Woman [3], Tales of Terror: The Painted Face [2], Hanako of the Toilet [2], Marebito [2], Sword of Blood [1], Noroi: The Curse [2], Scream Girls [3], Urban Spirit Legend: Reishi Gakuen [2], Ju-On: White Ghost [2], Ox-Head Village [2]
- **Big Man Japan (2007)**: Outer Man [3], Shin Ultraman [3], Inuyashiki [2], Meatball Machine [2], Geharha: The Dark and Long-Haired Monster [3], Yuzo the Biggest Battle in Tokyo [2], Zebraman [3], The World Sinks Except Japan [2], Kekko Kamen Premium [1], Earth Defense Widow [2]
- **The Ministry of Ungentlemanly Warfare (2024)**: Operation Fortune: Ruse de Guerre [2], Guy Ritchie's The Covenant [1], The Sea Wolves [3], Murder Company [2], The Dirty Dozen [3], The Man from U.N.C.L.E. [2], The Guns of Navarone [3], Where Eagles Dare [3], Heads of State [1], The King's Man [2]
- **Guardians of the Galaxy (2014)**: Guardians of the Galaxy Vol. 2 [3], Guardians of the Galaxy Vol. 3 [3], Avengers: Infinity War [3], The Guardians of the Galaxy Holiday Special [3], Captain Marvel [2], Avengers: Endgame [3], The Marvels [2], Thor: Ragnarok [3], Superman [1], Captain America: Civil War [2]
- **Doraemon: Nobita and the Green Giant Legend (2008)**: Doraemon: Nobita and the Tin Labyrinth [3], Doraemon: Nobita's New Great Adventure Into the Underworld - The Seven Magic Users [3], Doraemon: Nobita and the Steel Troops [3], Doraemon: Nobita's Little Star Wars [2], Stand by Me Doraemon [2], Doraemon: A Grandmother's Recollections [2], Doraemon Comes Back [2], The Day I Bought a Star [2], Doraemons: Strange, Sweet, Strange? [2], Doraemon: Nobita and the Future Notes [3]
- **Dog Bite Dog (2006)**: SPL: Kill Zone [2], Dark War [2], The Enforcer [2], A Game Of No Rule [1], Infernal Affairs II [2], Motorway [1], Flash Point [1], Hit Team [1], To Live and Die in Tsimshatsui [2], Time and Tide [2]
- **Brother Bear (2003)**: Open Season [3], The Bear [2], Alaska [1], Balto [2], The Jungle Book [2], The Little Bear Movie [2], The Many Adventures of Winnie the Pooh [1], The Big Trip [2], Brave [2], Over the Hedge [1]
- **Minuscule: Valley of the Lost Ants (2013)**: Antz [3], A Bug's Life [3], A Monster in Paris [0], Ernest & Celestine [1], The Butterfly [0], Remi, Nobody's Boy [0], Adventure of an Ant [3], The Little Prince [1], April and the Extraordinary World [0], Ratatouille [1]
- **Rudolph the Red-Nosed Reindeer (1964)**: Frosty the Snowman [3], The Snowman [3], The Polar Express [3], Klaus [2], Mickey's Twice Upon a Christmas [2], How the Grinch Stole Christmas! [2], That Christmas [2], Knick Knack [1], A Boy Called Christmas [2], Mickey's Once Upon a Christmas [2]
- **Dolores Claiborne (1995)**: Mystic River [2], The Devil's Advocate [0], Cape Fear [1], Secret Window [1], Mildred Pierce [2], To Kill For [1], This Boy's Life [3], L.A. Confidential [1], Troubling Love [3], Beloved [2]
- **No Time to Die (2021)**: Quantum of Solace [3], Skyfall [3], Spectre [3], Goldfinger [2], The King's Man [2], Mission: Impossible - Dead Reckoning Part One [3], Operation Fortune: Ruse de Guerre [2], Casino Royale [1], The Courier [2], Mission: Impossible - The Final Reckoning [3]
- **What We Do in the Shadows (2014)**: Braindead [2], American Zombie [3], Vampires of the Velvet Lounge [3], Scouts Guide to the Zombie Apocalypse [2], Bit [2], Shaun of the Dead [2], Humanist Vampire Seeking Consenting Suicidal Person [2], Zombieland [2], Hunt for the Wilderpeople [1], Boy [0]
- **Babygirl (2024)**: Unfaithful [3], Deep Water [3], The Voyeurs [2], Fidelity [3], Queen of Hearts [2], Nine 1/2 Weeks [3], Good Luck to You, Leo Grande [2], Ask Me What You Want [2], The Hating Game [1], Materialists [2]
- **Miracles from Heaven (2016)**: Breakthrough [3], Ordinary Angels [3], The Healer [2], War Room [2], Lucy Shimmers and the Prince of Peace [2], My Sister's Keeper [3], The Shack [2], The Ultimate Gift [1], Country Remedy [1], Resurrection [2]
- **The Public Enemy (1931)**: Angels with Dirty Faces [3], Scarface [3], Miller's Crossing [2], White Heat [3], Woman Unafraid [1], On the Waterfront [1], High Sierra [2], Deuces Wild [2], Once Upon a Time in America [2], A Bronx Tale [2]
- **The Hunger Games (2012)**: The Hunger Games: Mockingjay - Part 1 [3], The Hunger Games: Mockingjay - Part 2 [3], The Hunger Games: Catching Fire [3], The Hunger Games: The Ballad of Songbirds & Snakes [3], The Hunger Games: Sunrise on the Reaping [3], The Darkest Minds [2], The Long Walk [2], Divergent [2], The Maze Runner [2], Insurgent [2]
- **The Grand Budapest Hotel (2014)**: The French Dispatch of the Liberty, Kansas Evening Sun [3], Castello Cavalcanti [2], Hotel Chevalier [2], The Wonderful Story of Henry Sugar [2], The Royal Tenenbaums [3], The Phoenician Scheme [3], Rushmore [3], The Darjeeling Limited [2], Moonrise Kingdom [2], The Life Aquatic with Steve Zissou [3]
- **Spread Your Wings (2019)**: The Wolf and the Lion [2], Fly Away Home [3], Vicky and Her Mystery [3], Belle and Sebastian: The Adventure Continues [3], Remi, Nobody's Boy [2], The Nightingale [2], Alaska [2], Sukkwan Island [2], The Bear [2], The Butterfly [2]
- **Rise of the Planet of the Apes (2011)**: Dawn of the Planet of the Apes [3], War for the Planet of the Apes [3], Kingdom of the Planet of the Apes [3], Planet of the Apes [2], Planet of the Apes [2], Rampage [2], Primate [1], Kong: Skull Island [1], I Am Legend [2], The One and Only Ivan [1]
- **Three Wishes for Cinderella (1973)**: Donkey's Hide [3], Dvanáct měsíčků [3], The Golden Fern [2], Dům U tří vlaštoviček [1], Three Wishes of Cinderella [3], Sestřičky růží [1], Noční mora [1], The Magical Portrait [2], The Feather Fairy [2], A Fairy Tale Told at Night [2]
- **Dunkirk (2017)**: Darkest Hour [2], Saving Private Ryan [3], Greyhound [2], A Bridge Too Far [2], 1917 [2], The Longest Day [3], Fury [2], Midway [1], The Ministry of Ungentlemanly Warfare [1], The Guns of Navarone [2]
- **Barbarian (2022)**: Bone Lake [2], Strange Darling [2], Succubus [2], The Inhabitants [3], Speak No Evil [3], Shell [2], Night of the Reaper [2], Wake [1], In Their Skin [2], Escapee [1]