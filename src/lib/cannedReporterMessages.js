/**
 * Canned contextual quote library for CRFFL Times-Herald Columnists.
 * Provides instant, zero-latency, highly authentic in-character banter
 * for Dr. Marcus Vance, Buck Callahan, Marty Sullivan, and Chloe Carmichael.
 */

export const REPORTERS_META = {
  marcus_vance: {
    id: 'marcus_vance',
    name: 'Dr. Marcus Vance',
    role: 'Senior Analytics Editor',
    avatar: '/reporters/marcus-vance-avatar.png',
  },
  buck_callahan: {
    id: 'buck_callahan',
    name: 'Buck Callahan',
    role: 'Chief Trench Correspondent',
    avatar: '/reporters/buck-callahan-avatar.png',
  },
  marty_sullivan: {
    id: 'marty_sullivan',
    name: 'Marty Sullivan',
    role: 'Traditionalist Columnist',
    avatar: '/reporters/marty-sullivan-avatar.png',
  },
  chloe_carmichael: {
    id: 'chloe_carmichael',
    name: 'Chloe Carmichael',
    role: 'Senior League Insider',
    avatar: '/reporters/chloe-carmichael-avatar.png',
  },
};

// ---------------------------------------------------------------------------
// DR. MARCUS VANCE — ANALYTICS & PROBABILITIES
// ---------------------------------------------------------------------------
const MARCUS_VANCE_QUIPS = {
  direct_reply: [
    "You rang, {manager}? My predictive engine has already recalculated your win probability. It is... not mathematically encouraging.",
    "Tagging me won't alter the laws of statistical probability, {manager}. Regression to the mean is relentless.",
    "I looked at the telemetry from your roster, {manager}. The delta between your expectations and reality is statistically catastrophic.",
    "My Monte Carlo simulation ran 10,000 iterations of your current matchup. You won exactly 412 of them. Would you like a tissue?",
    "Every variable in your starting lineup is currently trending toward maximum entropy, {manager}.",
    "According to my proprietary Vance Index, your managerial confidence is currently exceeding your expected points by 340%.",
    "I appreciate the ping, {manager}, but my quantitative models do not accept emotional appeals as valid input parameters.",
    "Fascinating inquiry. If we plot your starting lineup's performance against league median, we see an alarming downward parabola.",
    "My spreadsheets don't lie, {manager}, but your starting roster certainly did on Thursday night.",
    "Statistically speaking, {manager}, you have a better probability of drawing a royal flush than overcoming this projected margin.",
  ],

  thriller: [
    "We are entering two-standard-deviation territory here. The win probability needle is oscillating violently!",
    "This contest is within a 3.4-point variance envelope. Every decimal point of garbage-time rushing is worth thousands in emotional equity.",
    "My server rack in the basement is overheating trying to calculate this margin. It's a genuine statistical coin flip!",
    "Win probability just shifted 42% in a single redzone drive. Heart rate telemetry across both franchises must be critical.",
    "A one-score game with under ten minutes of live game clock. Mathematically speaking: absolute chaos.",
  ],

  blowout: [
    "The trailing team's win probability has mathematically cratered below 0.04%. I recommend beginning the post-game grievance filing.",
    "This is no longer a fantasy contest; it is a clinical demonstration of negative variance and total roster collapse.",
    "I have terminated the predictive model for this matchup to conserve league compute resources. It's over.",
    "Statistically speaking, trailing by 35 points with your kicker as your remaining starter is not an optimal victory path.",
    "The garbage-time production necessary to salvage this differential would violate several local ordinances.",
  ],

  bench_points: [
    "Fascinating case study in roster misallocation: your bench currently represents 44.2% of your franchise's total theoretical output.",
    "Leaving 30 points on the pine is an intriguing strategy, {manager}. Regrettably, the Sleeper platform does not score moral victories.",
    "My post-hoc audit reveals that starting your backup tight end would have swung your win probability by 61.8%. Hindsight is a brutal statistician.",
    "Bench mismanagement of this magnitude generally correlates with a 78% drop in playoff seeding probability.",
  ],

  manager_callouts: {
    Eric: [
      "The Commissioner's Excel macros seem to be malfunctioning today. Even executive power cannot override a sub-zero FLEX performance.",
      "Eric, the imperial fleet is taking heavy flak in the trenches today. Your win probability needs reinforcements from the outer rim.",
      "Commissioner Eric, I ran the historical precedent: no league founder has ever won a title while leaving this many points on the bench.",
    ],
    Corey: [
      "Corey, you can't buy your way out of a 25-point deficit. The statistical spread has officially called your bluff.",
      "Team CoreyCash is experiencing severe inflation today: high investment, negligible fantasy dividends.",
      "My models suggest Corey is one missed extra point away from demanding an immediate audit of the scoring settings.",
    ],
    Ed: [
      "Ed, the Silver and Black telemetry is showing critical structural failure today. Your win probability is in full rebuild mode.",
      "I appreciate Ed's loyalty to the running game, but in modern analytical fantasy football, 2.1 yards per carry is purely cosmetic.",
      "Ed, my algorithms detect a severe deficit of completed passes. Just win, baby... or at least score 90 points.",
    ],
    Jeff: [
      "Jeff's corn-fed roster is facing an analytical drought today. The harvest yield is roughly 15 points below projections.",
      "Hickory Huskers showing great character, Jeff, but character carries a weighted coefficient of exactly zero in decimal scoring.",
      "Jeff, my soil analysis reveals your starting lineup failed to establish root depth in the red zone today.",
    ],
    KC: [
      "KC, the variance on your roster today is wider than the Grand Canyon. Standard deviation is having a field day.",
      "Shortbus Superstars living up to the chaotic distribution curve. Either 140 points or 65—there is no middle ground with KC.",
      "KC's lineup decisions today could only be produced by a random number generator operating on low battery.",
    ],
    Marcus: [
      "Marcus, as a fellow man of science and culture, I must inform you: your starting lineup is clinically flatlining.",
      "Team Killa MC is currently experiencing a 3-sigma negative deviation. My diagnostic: complete offensive stagnation.",
      "Marcus, your win probability just suffered an acute traumatic injury. Prognosis: extremely grim.",
    ],
    'Mike F.': [
      "Mike F.'s Stars & Stripes flying at half-mast this afternoon. The analytics show a severe red-zone embargo.",
      "Blue-collar work ethic is admirable, Mike F., but your WR corps is generating sub-replacement-level separation metrics.",
      "Mike F., my quantitative sensors indicate your opponent's ceiling has completely outstripped your defensive floor.",
    ],
    'Mike M.': [
      "Mike M., your roster was supposed to be 'Moore Better,' but empirically speaking, it is demonstrably worse.",
      "The pun-to-production ratio on Mike M.'s franchise today is approaching an all-time critical high.",
      "Mike M. is quietly calculating his draft position in real-time right now. The math does not lie.",
    ],
    Pam: [
      "Pam's garden is producing weeds this afternoon. The photosynthesis of your starting wideouts is completely stalled.",
      "Team GardenGoddess usually harvests points with ruthless precision, Pam, but today's crop is suffering from frostbite.",
      "Pam, even the most fertile soil cannot grow points when your quarterback throws two picks into triple coverage.",
    ],
    Randy: [
      "Randy's Generic Football Team is performing with remarkably generic efficiency—by which I mean perfectly mediocre.",
      "Randy, your spreadsheet signature today is flatline. Zero boom, maximum dud. Consistency at its most heartbreaking.",
      "Generic Football Team living up to its branding, Randy. If gray paint had a fantasy projection, this would be it.",
    ],
  },

  general: [
    "The statistical distribution of touchdowns across the 1 PM slate is violating the central limit theorem.",
    "Friendly reminder: your gut feeling is merely indigestion masquerading as analytical intuition.",
    "I am currently graphing every manager's blood pressure against their live matchup margin. The correlation is R = 0.98.",
    "Fantasy football remains an elaborate exercise in managing emotional exposure to high-variance outcomes.",
  ],
};

// ---------------------------------------------------------------------------
// BUCK CALLAHAN — THE GRIT DESK & TRENCH WARFARE
// ---------------------------------------------------------------------------
const BUCK_CALLAHAN_QUIPS = {
  direct_reply: [
    "You want my take, {manager}? Put down the phone, put on a helmet, and find me a running back who actually hits the hole with authority!",
    "Don't whine to me about your projected score, {manager}! Points are won in the mud on 4th-and-goal, not on your little app screen!",
    "Listen to me, {manager}: you got guys on your roster who don't even have grass stains on their jerseys. That ain't football, that's flag ballet!",
    "I looked at your roster, {manager}. Too many finesse route runners, not enough guys who eat gravel for breakfast. Soft!",
    "You're tagging the wrong guy if you want sympathy, {manager}. Go ask Dr. Vance for a crying spreadsheet. I want to see somebody crack some pads!",
    "Grit check, {manager}! Your team looks like they're playing two-hand touch out there. Where's the dog in 'em?!",
    "I don't care about your targets or your air yards, {manager}. Did your boys move the pile or did they get stood up at the line?!",
    "Back in my day, {manager}, if your kicker missed from 42, he walked home with his equipment bag. Times have gone soft!",
  ],

  thriller: [
    "NOW WE'RE PLAYING FOOTBALL! Under ten points, two minutes on the clock, slobber-knocker in the trenches!",
    "This is what November football is about, boys! Chinstraps buckled, mouthguards chewed up, every yard paid in blood and bruised ribs!",
    "Forget the analytics! This game is gonna come down to who wants that fumble pile more! Pure unadulterated GRIT!",
    "You can smell the icy hot and smelling salts from here! Down to the wire in the GRITZone!",
    "This ain't for the faint of heart! If you can't stomach a 2-point spread in the 4th quarter, go watch professional tennis!",
  ],

  blowout: [
    "Towel's on the field! That's a full-blown surrender cobra! Pack up the bus and take a cold shower!",
    "Down 40 points? That's not a defeat, that's an eviction notice. Somebody check their sideline for folding chairs!",
    "Total lack of heart out there today. When you're getting drummed by four touchdowns, you don't look at projections, you look in the mirror!",
    "I haven't seen a team get pushed around the line of scrimmage like this since my freshman year JV scrimmage against state champs.",
    "Mercy rule needs to be instituted in this league. That squad gave up back in the second quarter!",
  ],

  bench_points: [
    "You left your toughest guy on the bench, {manager}! The fella with the bruised forearm is sitting on pine while your pretty boy gets zero!",
    "Don't cry to me about points on the bench! A real coach knows who's got the fire before kickoff, not on Monday morning!",
    "Leaving thirty points on the sideline is what happens when you listen to fantasy podcasts instead of checking a man's pulse!",
  ],

  manager_callouts: {
    Eric: [
      "Commish Eric, you can write all the memos you want, but your offensive line is getting manhandled at the point of attack!",
      "Rebel Scum looks like they surrendered to the Empire before the opening coin toss today, Eric! Where's the grit?!",
      "Eric, the commissioner's desk is nice and warm, but out here on the field your boys are getting shoved into the second row!",
    ],
    Corey: [
      "Corey, you can't pay a linebacker to hit harder! All that Team CoreyCash swagger and your boys are dancing out of bounds!",
      "Corey's team plays football like they're worried about scuffing their cleats. Hit the hole and lower your shoulder, son!",
      "Money talks, Corey, but right now your starting lineup is whispering apologies to the defense!",
    ],
    Ed: [
      "Ed knows what real football looks like, but his squad today is playing like they forgot the stadium was in Vegas! Wake up!",
      "RaiderRose510 needs to dial up some 1976 Madden football right now. Line up in the I-formation and run it down their throats, Ed!",
      "Ed, I respect the black and silver grit, but your boys are getting pushed backwards on 3rd-and-short!",
    ],
    Jeff: [
      "Jeff! The Huskers used to run the option and break willpowers! What is this horizontal bubble screen nonsense your team is running?!",
      "Jeff, line 'em up behind a pulling guard and smash it! Stop waiting for fancy passing plays that end in punts!",
      "Hickory Huskers need some good old-fashioned Midwest grit today, Jeff. Grab a salt tablet and get back out there!",
    ],
    KC: [
      "KC! What in the name of Lombardi is going on with your roster?! One guy scores thirty and three guys don't even break a sweat!",
      "Shortbus Superstars playing backyard sandbox ball today, KC! You need some discipline and a fullback in that lineup!",
      "KC, if your boys played with half as much hustle as they do attitude, you'd be up by four scores!",
    ],
    Marcus: [
      "Marcus! Killa MC was supposed to bring the sledgehammer today! All I'm seeing is whiffed blocks and fair catches!",
      "Marcus, your skill players are running out of bounds to avoid contact. Somebody put some smelling salts under their nose!",
      "Team Killa MC looking more like Team Gentle Hug today, Marcus. Hit somebody!",
    ],
    'Mike F.': [
      "Mike F.! I know you respect the grind, but your boys look like they ran two miles with weighted vests before kickoff!",
      "Stars & Stripes needs to find an extra gear, Mike! You're getting out-muscled on every single 50/50 ball!",
      "Mike F., strap that helmet on tight. This afternoon is about gut checks, and your team is on the ropes!",
    ],
    'Mike M.': [
      "Mike M., you can call it 'Moore Better,' but out here in the dirt, it looks a whole lot worse! Put a shoulder into 'em!",
      "Mike M. is hoping for a miracle through the air. Real men win fantasy games on the ground with six yards and a cloud of dust!",
      "Stop dancing in the backfield, Mike M.! North and south! Get upfield and take the hit!",
    ],
    Pam: [
      "Pam usually brings the steel-toed boots, but today her garden is getting bulldozed by a four-man defensive front!",
      "Team GardenGoddess needs to find that old-school nastiness, Pam! Stop planting flowers and start throwing lead blocks!",
      "Pam, your boys look polite out there. Football ain't a tea party, it's an alley fight in pads!",
    ],
    Randy: [
      "Randy, Generic Football Team is living up to the name! Where's the fire?! Where's the thunder?! Give me some juice, son!",
      "Randy's squad is running plays like they're reading instructions off a microwave dinner. Show some passion!",
      "Generic Football Team needs an injection of pure diesel fuel today, Randy. Wake the bench up!",
    ],
  },

  general: [
    "If your quarterback slides instead of diving for the pylon, drop him on waivers tonight. That's my scouting report.",
    "Real fantasy owners don't look at win probability meters. They look at fourth-quarter red-zone touches.",
    "Rain, mud, frozen turf, broken chinstraps. That's the GRITZone. If you want comfort, go watch curling.",
  ],
};

// ---------------------------------------------------------------------------
// MARTY SULLIVAN — TRADITIONALIST & LEAGUE HISTORIAN
// ---------------------------------------------------------------------------
const MARTY_SULLIVAN_QUIPS = {
  direct_reply: [
    "I was covering this league back when we calculated scores on napkins with grease pencils, {manager}. Your current panic is nothing new.",
    "In 2017, {manager}, I watched a manager blow a 45-point lead on Monday Night Football because of a blocked extra point. Settle down.",
    "You kids today with your 60-second live refreshes. Back in 2012, we waited for the Tuesday morning newspaper to find out who won!",
    "I've seen ten seasons of CRFFL football, {manager}. Teams that cry in the group chat in the third quarter never hoist the trophy.",
    "A wise coach once told me, {manager}: 'You don't lose the game on Sunday afternoon; you lose it on Wednesday when you get cute with waivers.'",
    "Don't talk to me about bad luck, {manager}. In 2015, Randy lost by 0.02 on a quarterback kneel-down. That's a bad beat. This is just poor execution.",
    "Listen here, {manager}: patience is a lost art. Good franchises weather the storm; bad ones panic and post trades at 2 AM.",
  ],

  thriller: [
    "Takes me back to the 2019 Week 11 classic between Ed and Eric. Came down to the final play of Monday night in the driving snow.",
    "This has the makings of a classic CRFFL finish. These are the matchups you remember when the banquet comes around in January.",
    "Two proud franchises refusing to give an inch. This is the caliber of competition that built the Times-Herald sports desk.",
    "Pressure does two things, boys: it makes diamonds, or it makes you leave your kicker in the lineup during his bye week.",
  ],

  blowout: [
    "Reminds me of the 2016 blowout when Mike F. hung 168 points on the board and nobody spoke for three days in the league chat.",
    "When the margin hits 35, the only story left to write is the post-mortem. I've got my typewriter ready for the Tuesday recap.",
    "A sound, thorough, textbook drubbing. No excuses, no flukes. Just good old-fashioned domination across all four quarters.",
  ],

  bench_points: [
    "Leaving points on the bench is the oldest sin in fantasy football. Vince Lombardi would have made you run gassers until dusk, {manager}.",
    "I've written this column forty times over the years: start your studs, don't overthink the matchups, and leave the bench alone.",
  ],

  manager_callouts: {
    Eric: [
      "The Commish has seen this movie before. In 2018, Eric started 0-2 and lectured everybody on patience before rallying to the playoffs.",
      "Eric's franchise carries a lot of history, but history doesn't tackle the ball carrier on 3rd-and-long, Commissioner.",
    ],
    Corey: [
      "Corey's got that 1980s swagger, but flashy uniforms don't win ball games when the fundamentals break down in the red zone.",
      "CoreyCash is living dangerously today. I remember when high-rollers used to dominate this league with three bellcow running backs.",
    ],
    Ed: [
      "Ed's loyalty is legendary in this bureau. He's been riding with the silver and black through thick and thin for over a decade.",
      "Ed knows the cardinal rule: you establish the run, you protect the football, and you don't panic when the scoreboard gets ugly.",
    ],
    Jeff: [
      "Jeff plays football the way it was meant to be played: quiet, focused, with clean handoffs and no end-zone celebrations.",
      "Hickory Huskers have that classic 1995 Nebraska demeanor, Jeff. Now let's see if the fourth quarter backs it up.",
    ],
    KC: [
      "KC has been keeping the aspirin companies in business with these cardiac finishes since the inaugural season.",
      "You never write KC's obituary until the clock hits double zeroes. I've seen him pull rabbits out of the hat on Monday night.",
    ],
    Marcus: [
      "Marcus has the championship pedigree, but even titleholders get a dose of humble pie when the turf is wet.",
      "Team Killa MC is facing a gut-check quarter, Marcus. Time to see what that veteran leadership is made of.",
    ],
    'Mike F.': [
      "Mike F. is built like an old-school defensive coordinator: stoic on the sideline, waiting for the opponent to make a mistake.",
      "Stars & Stripes doesn't beat themselves very often. If they go down today, it'll be with their boots on.",
    ],
    'Mike M.': [
      "Mike M. has been playing the long game in this league for years. Always lurking around the playoff bubble with a quiet smile.",
      "Moore Better knows how to grind out ugly wins. An ugly 88-85 victory counts just as much as a 140-point fireworks show.",
    ],
    Pam: [
      "Pam has sent more than one overconfident manager home with their tail between their legs over the years. Never count out the Goddess.",
      "Team GardenGoddess operates with quiet ruthlessness. When Pam smells blood in the water, she closes the deal.",
    ],
    Randy: [
      "Randy is the master of the understated masterclass. Doesn't say a word, just quietly stacks points and moves up the standings.",
      "Generic Football Team might have the most boring name in sport, but Randy's trophy shelf speaks for itself.",
    ],
  },

  general: [
    "Coffee is black, the typewriter ribbon is fresh, and the Sunday afternoon recap is practically writing itself.",
    "Formations come and go, but blocking, tackling, and avoiding three-and-outs will always decide championships.",
  ],
};

// ---------------------------------------------------------------------------
// CHLOE CARMICHAEL — TRANSACTIONS & THE SPIN ROOM
// ---------------------------------------------------------------------------
const CHLOE_CARMICHAEL_QUIPS = {
  direct_reply: [
    "Oh, you want the tea, {manager}? Sources close to the locker room say your trade proposals this week were getting laughed out of the inbox.",
    "Tagging me won't refund the 45% of your FAAB budget you blew on a backup running back who got two touches today, {manager}.",
    "My DMs are open, {manager}, but right now the only buzz around your franchise is how fast you're dropping in Dr. Vance's rankings.",
    "League insiders are already speculating about your waiver wire priority on Tuesday morning, {manager}. Don't shoot the messenger!",
    "Breaking news, {manager}: your starting lineup is currently being investigated for lack of offensive intent.",
    "I hear chatter in the front office, {manager}. Word is, if this week goes sideways, you're putting your entire roster on the trade block.",
    "Spoke to two rival managers who asked to remain anonymous: they both said your Week 3 lineup was an 'early Christmas gift.' Ouch!",
    "The Spin Room is in session, {manager}! How are we going to spin a 72-point total as a 'tactical bye week reload'?",
  ],

  thriller: [
    "Front office sources tell me both managers in this matchup are actively pacing their living rooms and ignoring text messages!",
    "The trade value of every player in this matchup is swinging by the snap right now. Stock is either skyrocketing or plummeting!",
    "Insider buzz: whoever loses this thriller is submitting three desperate 2-for-1 trade packages before midnight tonight.",
  ],

  blowout: [
    "League sources confirm the blowout victim's group chat notifications have been muted until Wednesday morning at the earliest.",
    "Total fire sale alert! When you get walloped like this, the vultures start circling your bench assets within minutes.",
    "The postgame press conference for this team is going to be pure deflection and coach-speak. 'We just have to execute better.' Sure!",
  ],

  bench_points: [
    "My phone is buzzing: rival managers are already texting about trade offers for {manager}'s bench players. They know you don't know who to start!",
    "Nothing says 'active front office disaster' quite like 35 points chilling on your bench while your starting tight end posts a bagel.",
  ],

  manager_callouts: {
    Eric: [
      "Sources inside the Commissioner's suite say Eric is already preparing a league-wide memo about 'competitive balance' after today's slate.",
      "Eric's trade hotline is notoriously busy on Sunday nights, but after this score, he might have to sweeten the pot.",
    ],
    Corey: [
      "Corey's high-stakes swagger is legendary, but insiders are asking if Team CoreyCash is about to declare fantasy bankruptcy this week.",
      "Word around the league is Corey is already drafting a monster blockbuster trade offer for Tuesday's waiver run.",
    ],
    Ed: [
      "Ed's locker room has a strict 'no panic' policy, but rival general managers are already sniffing around his running back depth.",
      "Sources say Ed's phone is currently on 'Do Not Disturb' while he watches the 4th quarter in silence.",
    ],
    Jeff: [
      "Jeff is the most disciplined GM in the league, but even the Huskers' front office has to be sweating this scoreline.",
      "Whispers around the league say Jeff hasn't checked his Sleeper app in two hours. That's true midwestern stoicism.",
    ],
    KC: [
      "KC's roster drama is always the #1 trending topic in the Spin Room. Nobody generates more headlines per snap than KC.",
      "Sources confirm KC's bench was celebrating that touchdown like they just won the Super Bowl. Pure vibes over there.",
    ],
    Marcus: [
      "Marcus is usually the GM fielding desperate calls, not making them. But today's box score might flip the script on Team Killa MC.",
      "The spin out of Marcus's camp is that this week was just a 'stress test' for his depth. Yeah, okay Marcus!",
    ],
    'Mike F.': [
      "Mike F. operates with total radio silence, but insider sources say he's quietly scouting the waiver wire wire-to-wire.",
      "Stars & Stripes is running a tight ship, but you can't spin a goose egg from your WR2 as 'tactical decoy play.'",
    ],
    'Mike M.': [
      "Mike M. has been orchestrating quiet 2-for-1 swaps all season. Will his depth pay off today or will the spin backfire?",
      "Sources in Moore Better's camp say Mike M. is already scouting the Week 4 waiver wire sleepers.",
    ],
    Pam: [
      "Pam has the poker face of a seasoned CEO. Rival managers think they have her on the ropes until she pulls off a miracle.",
      "The buzz around Team GardenGoddess: Pam is quietly plotting a trade coup while everyone else is watching the 4 PM games.",
    ],
    Randy: [
      "Randy's Generic Football Team gives the press nothing to work with. No quotes, no leaks, just relentless, boring points.",
      "Insider report on Randy: zero drama, zero trade rumors, 100% focused on quietly stealing the #1 seed.",
    ],
  },

  general: [
    "Reminder: the waiver wire unlocks at 12:01 AM Tuesday. Start counting your FAAB pennies now, folks.",
    "My sources confirm that Sunday evening trade negotiations are 80% alcohol, 15% desperation, and 5% actual logic.",
  ],
};

const ALL_REPORTER_POOLS = {
  marcus_vance: MARCUS_VANCE_QUIPS,
  buck_callahan: BUCK_CALLAHAN_QUIPS,
  marty_sullivan: MARTY_SULLIVAN_QUIPS,
  chloe_carmichael: CHLOE_CARMICHAEL_QUIPS,
};

/**
 * Instantly selects a razor-sharp, contextual in-character quip for a reporter.
 * Zero external API latency, zero lambda freeze risk, guaranteed rich character.
 */
export function getInstantReporterQuip({
  reporterId = null,
  managerName = 'Manager',
  messageText = '',
  matchupContext = '',
  teamName = '',
}) {
  // 1. Select reporter
  const reporterIds = ['marcus_vance', 'buck_callahan', 'marty_sullivan', 'chloe_carmichael'];
  const targetId = reporterId && ALL_REPORTER_POOLS[reporterId]
    ? reporterId
    : reporterIds[Math.floor(Math.random() * reporterIds.length)];

  const pool = ALL_REPORTER_POOLS[targetId];
  const meta = REPORTERS_META[targetId];
  const lowerMsg = (messageText || '').toLowerCase();

  // 2. Determine best contextual category
  let candidateQuotes = [];

  // Check for direct tag / reply
  const isDirectTag = lowerMsg.includes('@marcus') ||
    lowerMsg.includes('@buck') ||
    lowerMsg.includes('@marty') ||
    lowerMsg.includes('@chloe') ||
    lowerMsg.includes('@reporter');

  if (isDirectTag && pool.direct_reply?.length) {
    candidateQuotes.push(...pool.direct_reply);
  }

  // Check for bench complaints
  if (lowerMsg.includes('bench') || lowerMsg.includes('pine') || lowerMsg.includes('started the wrong')) {
    if (pool.bench_points?.length) candidateQuotes.push(...pool.bench_points);
  }

  // Check for matchup thrillers or blowouts in context
  const lowerCtx = (matchupContext || '').toLowerCase();
  if (lowerCtx.includes('thriller') || lowerCtx.includes('close') || lowerCtx.includes('under 10')) {
    if (pool.thriller?.length) candidateQuotes.push(...pool.thriller);
  } else if (lowerCtx.includes('blowout') || lowerCtx.includes('30+') || lowerCtx.includes('40+')) {
    if (pool.blowout?.length) candidateQuotes.push(...pool.blowout);
  }

  // Check for manager-specific callouts
  const cleanMgr = (managerName || '').trim();
  if (cleanMgr && pool.manager_callouts?.[cleanMgr]?.length) {
    candidateQuotes.push(...pool.manager_callouts[cleanMgr]);
  }

  // Fallback to general pool if no specific context matched
  if (candidateQuotes.length === 0) {
    candidateQuotes = [...(pool.general || []), ...(pool.direct_reply || [])];
  }

  // 3. Pick random quote from candidates
  const rawQuote = candidateQuotes[Math.floor(Math.random() * candidateQuotes.length)] ||
    "The action in the GRITZone is heating up right now. Buckle up!";

  // 4. Interpolate variables
  const formattedQuote = rawQuote
    .replaceAll('{manager}', cleanMgr || 'Coach')
    .replaceAll('{team}', teamName || 'Franchise');

  return {
    reporterId: targetId,
    name: meta.name,
    role: meta.role,
    avatar: meta.avatar,
    message: formattedQuote,
  };
}
