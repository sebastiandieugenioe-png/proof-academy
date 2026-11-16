// Original explanatory diagrams for lessons (our own SVG — no licensing issues).
// Each diagram only shows facts that the lesson itself teaches (rule: what we show
// must be taught in the lesson). Keyed by lesson slug; lessons without a diagram
// render nothing. Server- and client-safe (no hooks).
//
// Design: 400-unit-wide viewBox so text stays readable on phones; slate ink,
// blue for process, amber for liquid/wood, green = keep, red = discard.

const C = {
  ink: '#0f172a', mute: '#64748b', line: '#cbd5e1', paper: '#f8fafc',
  blue: '#1d4ed8', blueBg: '#eff6ff', blueLine: '#93c5fd',
  amber: '#b45309', amberBg: '#fef3c7', amberLine: '#f59e0b',
  green: '#047857', greenBg: '#ecfdf5', greenLine: '#6ee7b7',
  red: '#b91c1c', redBg: '#fef2f2', redLine: '#fca5a5',
}

// ---------- primitives ----------
const Txt = ({ x, y, children, size = 13, weight = 500, fill = C.ink, anchor = 'middle', italic }) => (
  <text x={x} y={y} fontSize={size} fontWeight={weight} fill={fill} textAnchor={anchor} fontStyle={italic ? 'italic' : 'normal'}>{children}</text>
)
// Multi-line text: lines = ['a', 'b'], lh = line height
const Lines = ({ x, y, lines, size = 12, lh = 15, weight = 400, fill = C.ink, anchor = 'middle' }) => (
  <text x={x} y={y} fontSize={size} fontWeight={weight} fill={fill} textAnchor={anchor}>
    {lines.map((l, i) => <tspan key={i} x={x} dy={i === 0 ? 0 : lh}>{l}</tspan>)}
  </text>
)
const Box = ({ x, y, w, h, fill = C.paper, stroke = C.line, r = 10, dash }) => (
  <rect x={x} y={y} width={w} height={h} rx={r} fill={fill} stroke={stroke} strokeWidth={1.5} strokeDasharray={dash ? '5 4' : undefined} />
)
const Arrow = ({ x1, y1, x2, y2, color = C.mute }) => (
  <g>
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1.8} markerEnd={`url(#osc-arrow-${color.slice(1)})`} />
  </g>
)
const Defs = () => (
  <defs>
    {[C.mute, C.blue, C.amber, C.green, C.red].map((c) => (
      <marker key={c} id={`osc-arrow-${c.slice(1)}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill={c} />
      </marker>
    ))}
  </defs>
)
// Labeled card: title + lines
const Card = ({ x, y, w, h, title, lines = [], tone = 'paper', titleSize = 13, lineSize = 11.5 }) => {
  const t = {
    paper: [C.paper, C.line, C.ink], blue: [C.blueBg, C.blueLine, C.blue], amber: [C.amberBg, C.amberLine, C.amber],
    green: [C.greenBg, C.greenLine, C.green], red: [C.redBg, C.redLine, C.red],
  }[tone]
  return (
    <g>
      <Box x={x} y={y} w={w} h={h} fill={t[0]} stroke={t[1]} />
      <Txt x={x + w / 2} y={y + 20} size={titleSize} weight={700} fill={t[2]}>{title}</Txt>
      {lines.length > 0 && <Lines x={x + w / 2} y={y + 38} lines={lines} size={lineSize} lh={14} fill={C.ink} />}
    </g>
  )
}

// ---------- diagrams ----------
const D = {}

// 1. ABV ↔ proof
D['what-is-alcohol'] = {
  title: 'ABV and US proof: proof = ABV × 2',
  h: 220,
  body: () => {
    const x0 = 30, x1 = 370, s = (v) => x0 + ((x1 - x0) * v) / 100
    return (
      <g>
        <Txt x={200} y={26} size={12} fill={C.mute} weight={600}>ABV — % of the liquid that is pure ethanol (20 °C)</Txt>
        <rect x={x0} y={40} width={x1 - x0} height={18} rx={9} fill={C.blueBg} stroke={C.blueLine} />
        <rect x={x0} y={40} width={s(40) - x0} height={18} rx={9} fill={C.blue} opacity={0.85} />
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={s(v)} y1={60} x2={s(v)} y2={66} stroke={C.mute} />
            <Txt x={s(v)} y={78} size={11} fill={C.mute}>{v}%</Txt>
          </g>
        ))}
        <Card x={20} y={96} w={170} h={58} title="40% ABV" lines={['= 80 proof', '40 mL ethanol per 100 mL']} tone="blue" />
        <Card x={210} y={96} w={170} h={58} title="43% ABV" lines={['= 86 proof']} tone="blue" />
        <Box x={60} y={170} w={280} h={38} fill={C.paper} />
        <Txt x={200} y={194} size={14} weight={700}>proof = ABV × 2 · ABV = proof ÷ 2</Txt>
      </g>
    )
  },
}

// 2. Fermentation
D['fermentation-basics'] = {
  title: 'Fermentation: yeast turns sugar into alcohol',
  h: 330,
  body: () => (
    <g>
      <Card x={10} y={14} w={110} h={52} title="Sugar" lines={['raw material']} tone="amber" />
      <Txt x={135} y={46} size={20} weight={700} fill={C.mute}>+</Txt>
      <Card x={150} y={14} w={100} h={52} title="Yeast" lines={['S. cerevisiae']} tone="blue" />
      <Arrow x1={256} y1={40} x2={282} y2={40} color={C.blue} />
      <Card x={286} y={8} w={104} h={64} title="Ethanol" lines={['+ CO₂', '+ flavour']} tone="green" />
      <Txt x={200} y={100} size={12} weight={700} fill={C.mute}>WHERE THE SUGAR COMES FROM</Txt>
      {[
        ['Grains', 'barley, corn, rye, wheat', 'whisky · beer · vodka · gin'],
        ['Grapes & fruit', '', 'wine · brandy'],
        ['Sugarcane / molasses', '', 'rum'],
        ['Agave', '', 'tequila · mezcal'],
      ].map(([a, b, c], i) => (
        <g key={a}>
          <Box x={10} y={112 + i * 44} w={168} h={36} fill={C.amberBg} stroke={C.amberLine} />
          <Txt x={94} y={b ? 127 + i * 44 : 135 + i * 44} size={12.5} weight={700} fill={C.amber}>{a}</Txt>
          {b && <Txt x={94} y={141 + i * 44} size={10.5} fill={C.ink}>{b}</Txt>}
          <Arrow x1={182} y1={130 + i * 44} x2={206} y2={130 + i * 44} />
          <Box x={210} y={112 + i * 44} w={180} h={36} fill={C.paper} />
          <Txt x={300} y={135 + i * 44} size={11} weight={600}>{c}</Txt>
        </g>
      ))}
      <Box x={10} y={292} w={380} h={30} fill={C.blueBg} stroke={C.blueLine} />
      <Txt x={200} y={312} size={11.5} weight={600} fill={C.blue}>Yeast stops at ~12–16% ABV → spirits need distillation</Txt>
    </g>
  ),
}

// 3. Distillation (pot still + cuts)
D['distillation-explained'] = {
  title: 'Pot still: ethanol boils first, the distiller makes the cut',
  h: 360,
  body: () => (
    <g>
      {/* still: neck + lyne arm, then the pot */}
      <path d="M95,150 L95,82 Q95,60 117,60 L190,60" fill="none" stroke={C.amber} strokeWidth={3} />
      <ellipse cx={95} cy={190} rx={58} ry={46} fill={C.amberBg} stroke={C.amber} strokeWidth={3} />
      <Txt x={95} y={188} size={11.5} weight={700} fill={C.amber}>Wash</Txt>
      <Txt x={95} y={203} size={10.5} fill={C.ink}>heated gently</Txt>
      {[70, 95, 120].map((x) => <path key={x} d={`M${x - 8},258 q8,-14 16,0`} fill="none" stroke={C.red} strokeWidth={2} />)}
      <Txt x={95} y={276} size={10.5} fill={C.red} weight={600}>heat</Txt>
      <Txt x={140} y={52} size={10.5} fill={C.mute}>vapour</Txt>
      {/* condenser */}
      <Box x={190} y={50} w={46} h={110} fill={C.blueBg} stroke={C.blueLine} />
      <path d="M190,60 L236,75 L190,90 L236,105 L190,120 L236,135 L213,150 L213,172" fill="none" stroke={C.amber} strokeWidth={2.5} />
      <Txt x={213} y={44} size={10.5} weight={700} fill={C.blue}>condenser</Txt>
      <Card x={262} y={48} w={128} h={76} title="Boiling points" lines={['Ethanol 78.4 °C', 'Water 100 °C', '→ ethanol rises first']} tone="paper" titleSize={12} lineSize={11} />
      <Arrow x1={213} y1={174} x2={213} y2={200} color={C.amber} />
      <Txt x={278} y={192} size={10.5} fill={C.mute}>liquid spirit</Txt>
      {/* cuts */}
      <Txt x={200} y={300} size={11.5} weight={700} fill={C.mute}>THE RUN IS CUT INTO THREE PARTS</Txt>
      <Card x={150} y={206} w={78} h={78} title="Heads" lines={['first vapours,', 'harsh', '→ discard']} tone="red" titleSize={12} lineSize={10} />
      <Card x={233} y={206} w={78} h={78} title="Hearts" lines={['clean core', '', '→ keep']} tone="green" titleSize={12} lineSize={10} />
      <Card x={316} y={206} w={78} h={78} title="Tails" lines={['oily, weak', '→ discard', 'or recycle']} tone="red" titleSize={12} lineSize={10} />
      <Txt x={200} y={322} size={10.5} fill={C.mute}>Heads are rich in acetaldehyde and ethyl acetate</Txt>
      <Txt x={200} y={342} size={10.5} fill={C.mute}>Column stills run continuously and reach ~95% ABV</Txt>
    </g>
  ),
}

// 4. Aging
D['aging-and-maturation'] = {
  title: 'Inside the barrel: three things happen',
  h: 300,
  body: () => (
    <g>
      {/* barrel */}
      <ellipse cx={200} cy={150} rx={78} ry={96} fill={C.amberBg} stroke={C.amber} strokeWidth={3} />
      {[-48, 0, 48].map((dy) => <path key={dy} d={`M128,${150 + dy} Q200,${158 + dy} 272,${150 + dy}`} fill="none" stroke={C.amber} strokeWidth={2} opacity={0.7} />)}
      <Txt x={200} y={146} size={13} weight={700} fill={C.amber}>Oak</Txt>
      <Txt x={200} y={162} size={11} fill={C.ink}>spirit inside</Txt>
      {/* extraction */}
      <Card x={6} y={20} w={118} h={84} title="1 Extraction" lines={['vanillin, lactones', '(coconut), tannins,', 'colour → spirit']} tone="amber" titleSize={12.5} lineSize={10.5} />
      <Arrow x1={124} y1={80} x2={146} y2={100} color={C.amber} />
      {/* oxidation */}
      <Card x={276} y={20} w={118} h={84} title="2 Oxidation" lines={['O₂ seeps in:', 'mellows, adds dried', 'fruit, nuts, leather']} tone="blue" titleSize={12.5} lineSize={10.5} />
      <Arrow x1={276} y1={80} x2={256} y2={100} color={C.blue} />
      {/* evaporation */}
      <Card x={100} y={254} w={200} h={40} title="" tone="paper" />
      <Txt x={200} y={270} size={12} weight={700}>3 Evaporation — angel’s share</Txt>
      <Txt x={200} y={286} size={10.5} fill={C.ink}>~2% a year in Scotland, more in hot climates</Txt>
      <Arrow x1={200} y1={246} x2={200} y2={252} />
      <Card x={6} y={172} w={104} h={62} title="New oak" lines={['intense: vanilla,', 'spice, deep colour']} tone="paper" titleSize={11.5} lineSize={10} />
      <Card x={290} y={172} w={104} h={62} title="Used casks" lines={['gentler: the base', 'spirit shows']} tone="paper" titleSize={11.5} lineSize={10} />
    </g>
  ),
}

// 5. Reading a label (fictional label, no real brand)
D['reading-spirit-labels'] = {
  title: 'How to read a spirit label (example label)',
  h: 350,
  body: () => (
    <g>
      <path d="M140,20 h120 v28 q18,10 18,40 v220 q0,10 -10,10 h-136 q-10,0 -10,-10 v-220 q0,-30 18,-40 z" fill={C.amberBg} stroke={C.amber} strokeWidth={2.5} />
      <Box x={128} y={110} w={144} h={170} fill="#fffdf7" stroke={C.amberLine} r={6} />
      <Txt x={200} y={132} size={10} fill={C.mute} weight={600}>EXAMPLE DISTILLERY</Txt>
      <Txt x={200} y={156} size={14} weight={800}>Scotch Whisky</Txt>
      <Txt x={200} y={176} size={11} fill={C.ink}>Single Malt</Txt>
      <Txt x={200} y={204} size={18} weight={800} fill={C.amber}>12</Txt>
      <Txt x={200} y={219} size={10} fill={C.ink}>YEARS OLD</Txt>
      <Txt x={200} y={244} size={10} fill={C.ink}>Product of Scotland</Txt>
      <Txt x={200} y={266} size={11} weight={700}>70 cl · 46% vol</Txt>
      {/* callouts left */}
      <Card x={4} y={130} w={106} h={58} title="Category" lines={['legally defined:', 'raw material & rules']} tone="blue" titleSize={11.5} lineSize={9.8} />
      <Arrow x1={110} y1={156} x2={150} y2={156} color={C.blue} />
      <Card x={4} y={200} w={106} h={58} title="Age statement" lines={['= youngest spirit', 'in the bottle']} tone="blue" titleSize={11.5} lineSize={9.8} />
      <Arrow x1={110} y1={214} x2={182} y2={208} color={C.blue} />
      {/* callouts right */}
      <Card x={290} y={150} w={106} h={58} title="Single malt" lines={['malted barley +', 'one distillery']} tone="blue" titleSize={11.5} lineSize={9.8} />
      <Arrow x1={290} y1={174} x2={238} y2={174} color={C.blue} />
      <Card x={290} y={220} w={106} h={58} title="Origin + ABV" lines={['protected origin;', 'strength in %']} tone="blue" titleSize={11.5} lineSize={9.8} />
      <Arrow x1={290} y1={250} x2={258} y2={256} color={C.blue} />
      <Txt x={200} y={344} size={10.5} fill={C.mute}>“Small batch”, “reserve”, “premium”: usually no legal meaning</Txt>
    </g>
  ),
}

// 6. What is whiskey
D['what-is-whiskey'] = {
  title: 'Whiskey in four steps — and four classic styles',
  h: 310,
  body: () => (
    <g>
      {[
        ['Grain mash', 'barley, corn,', 'rye, wheat'],
        ['Ferment', 'yeast makes', 'alcohol'],
        ['Distil', 'below ~95%', 'ABV'],
        ['Age in oak', 'then bottle', 'at ≥ 40%'],
      ].map(([t, a, b], i) => (
        <g key={t}>
          <Card x={6 + i * 99} y={14} w={88} h={70} title={t} lines={[a, b]} tone={i === 3 ? 'amber' : 'blue'} titleSize={11.5} lineSize={10.5} />
          {i < 3 && <Arrow x1={96 + i * 99} y1={49} x2={104 + i * 99} y2={49} color={C.blue} />}
        </g>
      ))}
      <Txt x={200} y={116} size={11.5} weight={700} fill={C.mute}>FOUR BEGINNER STYLES</Txt>
      {[
        ['Scotch', '“whisky”', 'Scotland · often malted', 'barley · can be smoky'],
        ['Irish', '“whiskey”', 'Ireland · usually triple-', 'distilled · smooth'],
        ['Bourbon', '“whiskey”', 'USA · corn-forward ·', 'vanilla, caramel'],
        ['Rye', '“whiskey”', 'USA/Canada · rye-forward', '· spicier, drier'],
      ].map(([t, sp, a, b], i) => {
        const x = 6 + (i % 2) * 196, y = 128 + Math.floor(i / 2) * 88
        return (
          <g key={t}>
            <Box x={x} y={y} w={190} h={78} fill={C.amberBg} stroke={C.amberLine} />
            <Txt x={x + 95} y={y + 22} size={14} weight={800} fill={C.amber}>{t}</Txt>
            <Txt x={x + 95} y={y + 38} size={10.5} fill={C.mute} italic>{sp}</Txt>
            <Lines x={x + 95} y={y + 55} lines={[a, b]} size={10.5} lh={13} />
          </g>
        )
      })}
    </g>
  ),
}

// 7. Irish whiskey — Single Pot Still mash + triple distillation
D['irish-whiskey'] = {
  title: 'Irish Single Pot Still: the mash and the three distillations',
  h: 300,
  body: () => (
    <g>
      <Txt x={200} y={24} size={11.5} weight={700} fill={C.mute}>SINGLE POT STILL MASH (BY LAW)</Txt>
      <rect x={10} y={36} width={114} height={40} fill={C.amber} rx={6} />
      <rect x={124} y={36} width={114} height={40} fill={C.amberLine} />
      <rect x={238} y={36} width={133} height={40} fill={C.amberBg} stroke={C.amberLine} />
      <rect x={371} y={36} width={19} height={40} fill={C.line} rx={4} />
      <Txt x={67} y={61} size={11} weight={700} fill="#fff">≥30% malted</Txt>
      <Txt x={181} y={61} size={11} weight={700} fill={C.ink}>≥30% unmalted</Txt>
      <Txt x={304} y={61} size={10.5} fill={C.ink}>rest: either barley</Txt>
      <Txt x={390} y={94} size={10} fill={C.mute} anchor="end">grey: up to 5% other cereals</Txt>
      <Txt x={200} y={116} size={10.5} fill={C.mute}>…distilled in pot stills at one distillery</Txt>
      <Txt x={200} y={146} size={11.5} weight={700} fill={C.mute}>TRIPLE DISTILLATION (MOST IRISH WHISKEY)</Txt>
      {['1st still', '2nd still', '3rd still'].map((t, i) => (
        <g key={t}>
          <path d={`M${36 + i * 120},230 q0,-50 38,-58 v-14 h8 v14 q38,8 38,58 z`} fill={C.amberBg} stroke={C.amber} strokeWidth={2} />
          <Txt x={78 + i * 120} y={220} size={11} weight={700} fill={C.amber}>{t}</Txt>
          {i < 2 && <Arrow x1={118 + i * 120} y1={200} x2={150 + i * 120} y2={200} color={C.amber} />}
        </g>
      ))}
      <Box x={10} y={248} w={380} h={40} fill={C.greenBg} stroke={C.greenLine} />
      <Txt x={200} y={273} size={11.5} weight={600} fill={C.green}>Each pass strips heavier compounds → smooth, light</Txt>
    </g>
  ),
}

// 8. Scotch regions (schematic, not a map)
D['scotch-whisky'] = {
  title: 'Scotch: five protected regions (+ the Islands, legally Highland)',
  h: 300,
  body: () => {
    const regions = [
      ['Speyside', 'fruity, elegant', 'blue'],
      ['Highland', 'wide range, often richer', 'blue'],
      ['Lowland', 'light, floral', 'blue'],
      ['Islay', 'smoky, peaty, medicinal', 'amber'],
      ['Campbeltown', 'briny, oily', 'blue'],
    ]
    return (
      <g>
        {regions.map(([n, s, tone], i) => {
          const x = 6 + (i % 2) * 196, y = 12 + Math.floor(i / 2) * 66
          return <Card key={n} x={x} y={y} w={190} h={56} title={n} lines={[s]} tone={tone} titleSize={13} lineSize={11} />
        })}
        <g>
          <Box x={202} y={144} w={190} h={56} fill="#fff" stroke={C.blueLine} dash />
          <Txt x={297} y={164} size={13} weight={700} fill={C.blue}>Islands</Txt>
          <Lines x={297} y={182} lines={['varied, often coastal', '(legally part of Highland)']} size={10} lh={12} />
        </g>
        <Box x={6} y={214} w={386} h={78} fill={C.paper} />
        <Txt x={199} y={236} size={12} weight={700}>Scotch by law</Txt>
        <Lines x={199} y={254} lines={['made & matured in Scotland · ≥3 years in oak (≤700 L)', '≥40% ABV · only water and caramel (E150a) may be added']} size={10.5} lh={15} />
      </g>
    )
  },
}

// 9. Bourbon — the strength ladder
D['bourbon'] = {
  title: 'Bourbon by US law: the rules in order',
  h: 320,
  body: () => {
    const steps = [
      ['Mash', '≥ 51% corn', 'rest: rye (spice) or wheat (soft)', 'amber'],
      ['Distil', '≤ 80% ABV', '160 proof', 'blue'],
      ['Into barrel', '≤ 62.5% ABV', '125 proof', 'blue'],
      ['Age', 'new, charred oak', 'Straight: ≥ 2 years', 'amber'],
      ['Bottle', '≥ 40% ABV', 'no colouring or flavouring', 'green'],
    ]
    return (
      <g>
        {steps.map(([t, a, b, tone], i) => (
          <g key={t}>
            <Box x={20} y={10 + i * 60} w={360} h={48} fill={{ amber: C.amberBg, blue: C.blueBg, green: C.greenBg }[tone]} stroke={{ amber: C.amberLine, blue: C.blueLine, green: C.greenLine }[tone]} />
            <circle cx={46} cy={34 + i * 60} r={13} fill={{ amber: C.amber, blue: C.blue, green: C.green }[tone]} />
            <Txt x={46} y={39 + i * 60} size={12} weight={800} fill="#fff">{i + 1}</Txt>
            <Txt x={70} y={30 + i * 60} size={12} weight={700} anchor="start">{t}</Txt>
            <Txt x={70} y={46 + i * 60} size={10.5} fill={C.mute} anchor="start">{b}</Txt>
            <Txt x={368} y={39 + i * 60} size={14} weight={800} anchor="end" fill={{ amber: C.amber, blue: C.blue, green: C.green }[tone]}>{a}</Txt>
          </g>
        ))}
        <Txt x={200} y={312} size={10.5} fill={C.mute}>Made anywhere in the USA — not only Kentucky</Txt>
      </g>
    )
  },
}

// 10. Rye — how much rye
D['rye-whiskey'] = {
  title: 'Rye whiskey: the more rye, the drier and spicier',
  h: 250,
  body: () => (
    <g>
      <Txt x={200} y={22} size={11.5} weight={700} fill={C.mute}>SHARE OF RYE IN THE MASH (US)</Txt>
      {[
        ['“Barely legal” rye', 51, 'closer to bourbon'],
        ['High-rye whiskey', 95, 'much more assertive'],
      ].map(([t, v, s], i) => (
        <g key={t}>
          <Txt x={10} y={52 + i * 62} size={12} weight={700} anchor="start">{t}</Txt>
          <rect x={10} y={60 + i * 62} width={380} height={22} rx={6} fill={C.paper} stroke={C.line} />
          <rect x={10} y={60 + i * 62} width={(380 * v) / 100} height={22} rx={6} fill={C.amber} opacity={0.85} />
          <Txt x={18} y={76 + i * 62} size={11.5} weight={800} fill="#fff" anchor="start">{v}% rye</Txt>
          <Txt x={390} y={52 + i * 62} size={10.5} fill={C.mute} anchor="end">{s}</Txt>
        </g>
      ))}
      <line x1={10 + 380 * 0.51} y1={36} x2={10 + 380 * 0.51} y2={156} stroke={C.red} strokeDasharray="4 3" />
      <Txt x={10 + 380 * 0.51} y={170} size={10.5} fill={C.red} weight={600}>legal minimum 51%</Txt>
      <Box x={10} y={186} w={380} h={54} fill={C.blueBg} stroke={C.blueLine} />
      <Txt x={200} y={207} size={12} weight={700} fill={C.blue}>Classic rye cocktails</Txt>
      <Txt x={200} y={226} size={11.5}>Old Fashioned · Manhattan · Sazerac</Txt>
    </g>
  ),
}

// 11. What is beer — brewing flow
D['what-is-beer'] = {
  title: 'From grain to beer',
  h: 382,
  body: () => {
    const steps = [
      ['Mash', 'malted grain + hot water:', 'starch → sugars', 'amber'],
      ['Wort', 'the sweet liquid', '', 'amber'],
      ['Boil with hops', 'bitterness, flavour, aroma', '+ natural preservative', 'green'],
      ['Cool + add yeast', '', '', 'blue'],
      ['Ferment', 'yeast eats sugar →', 'alcohol + CO₂ = beer', 'blue'],
    ]
    // stack cards with a constant 26-unit gap for the arrows
    let y = 6
    const placed = steps.map(([t, a, b, tone]) => {
      const h = b ? 62 : a ? 48 : 32
      const row = { t, a, b, tone, y, h }
      y += h + 26
      return row
    })
    return (
      <g>
        {placed.map(({ t, a, b, tone, y, h }, i) => (
          <g key={t}>
            <Card x={70} y={y} w={260} h={h} title={t} lines={b ? [a, b] : a ? [a] : []} tone={tone} titleSize={12.5} lineSize={10.5} />
            {i < placed.length - 1 && <Arrow x1={200} y1={y + h + 3} x2={200} y2={y + h + 23} />}
          </g>
        ))}
      </g>
    )
  },
}

// 12. Beer ingredients
D['beer-ingredients'] = {
  title: 'The four ingredients and what each one does',
  h: 270,
  body: () => (
    <g>
      <Card x={6} y={8} w={190} h={120} title="Water" lines={['90–95% of the beer', 'its minerals shaped', 'regional styles', '(soft Pilsen, hard Burton)']} tone="blue" />
      <Card x={204} y={8} w={190} h={120} title="Malt" lines={['germinated, kilned grain', 'fermentable sugars,', 'colour, body, flavour', 'base + specialty malts']} tone="amber" />
      <Card x={6} y={138} w={190} h={124} title="Hops" lines={['flowers of Humulus lupulus', 'alpha acids → bitterness', 'oils → aroma', 'natural preservative']} tone="green" />
      <Card x={204} y={138} w={190} h={124} title="Yeast" lines={['sugar → alcohol + CO₂', 'Ale: S. cerevisiae', '15–24 °C, fruity, spicy', 'Lager: S. pastorianus 7–13 °C']} tone="paper" />
    </g>
  ),
}

// 13. Ale vs lager
D['ale-vs-lager'] = {
  title: 'Ale vs lager: it’s the yeast and the temperature',
  h: 330,
  body: () => {
    const Tank = ({ x, top, label, tone }) => (
      <g>
        <path d={`M${x},60 h120 v150 q0,30 -60,40 q-60,-10 -60,-40 z`} fill={tone === 'ale' ? C.amberBg : C.blueBg} stroke={tone === 'ale' ? C.amber : C.blue} strokeWidth={2.5} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <circle key={i} cx={x + 18 + i * 17} cy={top ? 76 + (i % 2) * 8 : 214 - (i % 2) * 8} r={6} fill={tone === 'ale' ? C.amber : C.blue} opacity={0.75} />
        ))}
        <Txt x={x + 60} y={140} size={11} weight={700} fill={tone === 'ale' ? C.amber : C.blue}>{label}</Txt>
      </g>
    )
    return (
      <g>
        <Txt x={100} y={28} size={16} weight={800} fill={C.amber}>ALE</Txt>
        <Txt x={300} y={28} size={16} weight={800} fill={C.blue}>LAGER</Txt>
        <Txt x={100} y={46} size={10.5} fill={C.mute}>S. cerevisiae</Txt>
        <Txt x={300} y={46} size={10.5} fill={C.mute}>S. pastorianus</Txt>
        <Tank x={40} top label="yeast rises" tone="ale" />
        <Tank x={240} label="yeast sinks" tone="lager" />
        <Card x={10} y={262} w={180} h={62} title="15–24 °C · fast" lines={['fruity esters, spicy', 'phenols · ~1 week']} tone="amber" titleSize={12} lineSize={10.5} />
        <Card x={210} y={262} w={180} h={62} title="7–13 °C · slow" lines={['clean, crisp · then', 'lagered near 0 °C']} tone="blue" titleSize={12} lineSize={10.5} />
      </g>
    )
  },
}

// 14. IBU vs ABV ranges
D['understanding-ibu-and-abv'] = {
  title: 'Typical bitterness (IBU) and strength (ABV) by style',
  h: 320,
  body: () => {
    const X0 = 46, X1 = 388, Y0 = 262, Y1 = 22
    const sx = (v) => X0 + ((X1 - X0) * v) / 80
    const sy = (v) => Y0 - ((Y0 - Y1) * (v - 3)) / 6
    const styles = [
      ['Light lager', 8, 12, 4, 5, C.blue],
      ['Pale ale', 30, 50, 4.5, 6, C.green],
      ['IPA', 40, 70, 5.5, 7.5, C.amber],
      ['Stout', 25, 60, 4, 8, C.ink],
    ]
    return (
      <g>
        <line x1={X0} y1={Y0} x2={X1} y2={Y0} stroke={C.mute} />
        <line x1={X0} y1={Y0} x2={X0} y2={Y1} stroke={C.mute} />
        {[0, 20, 40, 60, 80].map((v) => <Txt key={v} x={sx(v)} y={Y0 + 16} size={10} fill={C.mute}>{v}</Txt>)}
        {[3, 5, 7, 9].map((v) => <Txt key={v} x={X0 - 8} y={sy(v) + 4} size={10} fill={C.mute} anchor="end">{v}%</Txt>)}
        <Txt x={(X0 + X1) / 2} y={Y0 + 34} size={11} weight={700} fill={C.mute}>IBU (bitterness) →</Txt>
        <text x={14} y={(Y0 + Y1) / 2} fontSize={11} fontWeight={700} fill={C.mute} textAnchor="middle" transform={`rotate(-90 14 ${(Y0 + Y1) / 2})`}>ABV →</text>
        {styles.map(([n, i0, i1, a0, a1, col]) => (
          <g key={n}>
            <rect x={sx(i0)} y={sy(a1)} width={sx(i1) - sx(i0)} height={sy(a0) - sy(a1)} rx={6} fill={col} opacity={0.14} stroke={col} strokeWidth={1.5} />
            <Txt x={(sx(i0) + sx(i1)) / 2} y={n === 'Stout' ? sy(a1) + 14 : sy(a0) - 6} size={11} weight={700} fill={col}>{n}</Txt>
          </g>
        ))}
        <Txt x={200} y={314} size={10.5} fill={C.mute}>Same IBU ≠ same taste: malt sweetness masks bitterness</Txt>
      </g>
    )
  },
}

// 15. Beer styles family tree
D['beer-styles-overview'] = {
  title: 'The main beer families',
  h: 360,
  body: () => {
    const col = (x, title, sub, tone, items) => (
      <g>
        <Card x={x} y={70} w={190} h={46} title={title} lines={[sub]} tone={tone} titleSize={13} lineSize={10.5} />
        {items.map(([n, abv], i) => (
          <g key={n}>
            <Box x={x} y={126 + i * 36} w={190} h={30} fill="#fff" stroke={C.line} />
            <Txt x={x + 10} y={146 + i * 36} size={11.5} weight={600} anchor="start">{n}</Txt>
            <Txt x={x + 182} y={146 + i * 36} size={10.5} fill={C.mute} anchor="end">{abv}</Txt>
          </g>
        ))}
      </g>
    )
    return (
      <g>
        <Card x={140} y={6} w={120} h={36} title="Beer" tone="paper" />
        <Arrow x1={180} y1={42} x2={110} y2={66} />
        <Arrow x1={220} y1={42} x2={290} y2={66} />
        {col(6, 'Ales', 'warm 15–24 °C · S. cerevisiae', 'amber', [
          ['Pale Ale', '4.5–6.5%'], ['IPA', '5.5–7.5%'], ['Stout & Porter', '4–7%'], ['Wheat beer', '4.5–5.5%'], ['Belgian ale', '6–9%'],
        ])}
        {col(204, 'Lagers', 'cold 7–13 °C · S. pastorianus', 'blue', [
          ['Pilsner', '4.5–5.5%'], ['Helles / Munich', '4.5–5.5%'], ['Bock', '6–9%'], ['Märzen', '5.5–6%'],
        ])}
        <Box x={204} y={274} w={190} h={78} fill={C.paper} stroke={C.line} dash />
        <Txt x={299} y={293} size={11.5} weight={700}>Hybrids</Txt>
        <Txt x={299} y={308} size={10} fill={C.ink}>Kölsch · Altbier · California Common</Txt>
        <Txt x={299} y={328} size={11.5} weight={700}>Sour & wild</Txt>
        <Txt x={299} y={343} size={10} fill={C.ink}>Berliner Weisse · Gose · Lambic</Txt>
      </g>
    )
  },
}

export const DIAGRAM_SLUGS = Object.keys(D)

export default function LessonDiagram({ slug, className = '' }) {
  const d = D[slug]
  if (!d) return null
  return (
    <figure className={`not-prose my-8 rounded-2xl border border-slate-200 bg-white p-4 md:p-6 ${className}`}>
      <svg viewBox={`0 0 400 ${d.h}`} role="img" aria-label={d.title} className="w-full h-auto max-w-[560px] mx-auto block" style={{ fontFamily: 'inherit' }}>
        <Defs />
        {d.body()}
      </svg>
      <figcaption className="mt-3 text-center text-xs text-slate-500">
        <span className="font-medium text-slate-700">{d.title}</span>
        <span className="text-slate-400"> · Diagram: Online Spirits Club</span>
      </figcaption>
    </figure>
  )
}
