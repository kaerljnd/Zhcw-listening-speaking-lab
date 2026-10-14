window.COURSE = {
  id: 'lesson2',
  lessonLabel: 'Lesson 2',
  title: '水产养殖与用餐偏好',
  subtitle: '3月24日真题：古代夏威夷鱼塘；口语主题：Dining Preferences。建议240分钟，可分段完成。',
  speakingTitle: 'Dining Preferences Interview',
  fullAudio: 'L2_00_full_fish_farming_v2.mp3',
  examQuestions: [
    {
      question: 'According to the talk, what problem can excessive food and waste from fish farms cause?',
      options: ['A rapid drop in fish production', 'Algal blooms and reduced oxygen in the water', 'A shortage of chemical fertilizers', 'The disappearance of coastal ponds'],
      answer: 1
    },
    {
      question: 'How does agricultural runoff contribute to algal blooms?',
      options: ['It carries fertilizers from fields into rivers and coastal waters', 'It removes algae from the water', 'It prevents rainwater from reaching farms', 'It brings juvenile fish into ponds'],
      answer: 0
    },
    {
      question: 'Why were the ancient Hawaiian fish ponds able to keep oxygen levels stable?',
      options: ['They used concentrated artificial fertilizer', 'They were completely separated from the ocean', 'Natural tidal flushing brought in seawater and removed waste', 'They contained no algae at all'],
      answer: 2
    },
    {
      question: 'What was the purpose of the small holes in the sluice gates?',
      options: ['To let juvenile fish enter but keep mature fish from escaping', 'To release all fish during high tide', 'To block fresh seawater from entering', 'To prevent algae from growing'],
      answer: 0
    }
  ],
  evidence: [
    { id: 'E1', label: '现代鱼类养殖的输入与后果', audio: 'L2E_v2_01_inputs.mp3', text: 'Modern fish farming relies on massive inputs of commercial feed to boost fish production. This can cause nutrient overload, where excessive amounts of uneaten food plus waste products trigger algal blooms.' },
    { id: 'E2', label: '藻华如何造成缺氧', audio: 'L2E_v2_02_oxygen.mp3', text: 'When those algal blooms die off, they decompose and deplete oxygen from the water, which can suffocate fish and other aquatic life.' },
    { id: 'E3', label: '农业径流与化肥', audio: 'L2E_v2_03_runoff.mp3', text: 'Of course, the main cause of algal blooms is chemical fertilizers in agricultural runoff, like when water from rain or irrigation flows over fields and carries the fertilizers into rivers and coastal waters.' },
    { id: 'E4', label: '古代夏威夷鱼塘', audio: 'L2E_v2_04_lokoia.mp3', text: "An intriguing alternative is, or was, the coastal fish ponds of ancient Hawaii, called Loko i'a. People in Hawaii are reviving them today. These ponds, built along the shore using mainly lava, captured nutrient-rich runoff from nearby fields, naturally fertilizing the ponds." },
    { id: 'E5', label: '潮汐冲洗保持稳定', audio: 'L2E_v2_05_tidal.mp3', text: 'The ponds used natural tidal flushing to bring in fresh seawater and remove waste, which kept oxygen levels stable.' },
    { id: 'E6', label: '水闸的小孔设计', audio: 'L2E_v2_06_gates.mp3', text: "And here's the clever part. The special sluice gates connecting the ponds to the ocean had small holes. These holes allowed juvenile fish to swim in from the ocean and fatten up on the food in the pond, but then prevented them from escaping once they matured, so they could be easily harvested." }
  ],
  vocab: [
    { id: 'V01', word: 'commercial feed', meaning: '商业鱼饲料', context: 'massive inputs of commercial feed', type: '基础词块' },
    { id: 'V02', word: 'boost production', meaning: '提高产量', context: 'to boost fish production', type: '基础词块' },
    { id: 'V03', word: 'nutrient overload', meaning: '营养物过量；营养负荷过高', context: 'This can cause nutrient overload.', type: '学术词汇' },
    { id: 'V04', word: 'uneaten food', meaning: '未被吃掉的食物', context: 'excessive amounts of uneaten food', type: '基础词块' },
    { id: 'V05', word: 'algal bloom', meaning: '藻华；藻类大量繁殖', context: 'waste products trigger algal blooms', type: '学术词汇' },
    { id: 'V06', word: 'decompose', meaning: '分解；腐烂', context: 'the algal blooms die off and decompose', type: '学术词汇' },
    { id: 'V07', word: 'deplete oxygen', meaning: '耗尽／大幅减少氧气', context: 'deplete oxygen from the water', type: '学术词块' },
    { id: 'V08', word: 'suffocate', meaning: '使窒息；因缺氧而死亡', context: 'suffocate fish and other aquatic life', type: '学术词汇' },
    { id: 'V09', word: 'agricultural runoff', meaning: '农业径流', context: 'chemical fertilizers in agricultural runoff', type: '学术词汇' },
    { id: 'V10', word: 'irrigation', meaning: '灌溉', context: 'water from rain or irrigation', type: '学术词汇' },
    { id: 'V11', word: 'nutrient-rich', meaning: '富含营养物的', context: 'nutrient-rich runoff from nearby fields', type: '学术词汇' },
    { id: 'V12', word: 'tidal flushing', meaning: '潮汐冲洗；借潮水换水', context: 'natural tidal flushing brought in seawater', type: '学术词块' },
    { id: 'V13', word: 'sluice gate', meaning: '水闸；闸门', context: 'special sluice gates connecting the ponds to the ocean', type: '学术词汇' },
    { id: 'V14', word: 'juvenile fish', meaning: '幼鱼', context: 'allowed juvenile fish to swim in', type: '学术词块' },
    { id: 'V15', word: 'fatten up', meaning: '长肥；育肥', context: 'fatten up on the food in the pond', type: '基础词块' },
    { id: 'V16', word: 'mature', meaning: '成熟；长成', context: 'once they matured', type: '基础词汇' }
  ],
  repeat: [
    { id: 'R1', audio: 'L2R_v2_01_inputs.mp3', prompt: 'commercial feed · boost production · nutrient overload', text: 'Modern fish farming relies on massive inputs of commercial feed to boost fish production.' },
    { id: 'R2', audio: 'L2R_v2_02_oxygen.mp3', prompt: 'die off · decompose · deplete oxygen', text: 'When those algal blooms die off, they decompose and deplete oxygen from the water.' },
    { id: 'R3', audio: 'L2R_v2_03_runoff.mp3', prompt: 'fertilizers · agricultural runoff · irrigation', text: 'Of course, the main cause of algal blooms is chemical fertilizers in agricultural runoff, like when water from rain or irrigation flows over fields and carries the fertilizers into rivers and coastal waters.' },
    { id: 'R4', audio: 'L2R_v2_04_lokoia.mp3', prompt: "built along the shore · lava · nutrient-rich runoff", text: 'These ponds, built along the shore using mainly lava, captured nutrient-rich runoff from nearby fields, naturally fertilizing the ponds.' },
    { id: 'R5', audio: 'L2R_v2_05_tidal.mp3', prompt: 'tidal flushing · fresh seawater · remove waste · stable', text: 'The ponds used natural tidal flushing to bring in fresh seawater and remove waste, which kept oxygen levels stable.' },
    { id: 'R6', audio: 'L2R_v2_06_gates.mp3', prompt: 'juvenile fish · fatten up · mature · harvested', text: 'These holes allowed juvenile fish to swim in from the ocean and fatten up on the food in the pond, but then prevented them from escaping once they matured, so they could be easily harvested.' }
  ],
  interview: [
    { id: 'Q1', question: 'How often do you eat out at restaurants? Do you do this daily, weekly, monthly, or less often?', structure: '频率 + 场景 + 原因' },
    { id: 'Q2', question: 'When you eat out, what type of food do you prefer? For example, do you like savory foods or desserts?', structure: '偏好 + 两个特点 + 例子' },
    { id: 'Q3', question: 'Can you tell me about a memorable dining experience or meal you or a friend had recently? What made it special or stand out?', structure: '背景—经历—结果' },
    { id: 'Q4', question: 'Some people believe that the atmosphere and service at a restaurant are just as important as the food quality. Do you agree or disagree? Why?', structure: '立场 + 比较 + 例子' }
  ],
  transferQuestion: 'If a university wants students to eat more healthily, should it improve food quality, lower prices, or change the dining environment? Choose one and explain why.',
  highlightedTranscript: [
    'Modern fish farming relies on massive inputs of ', 'commercial feed', ' to ', 'boost fish production', '. This can cause ', 'nutrient overload', ', where excessive amounts of ', 'uneaten food', ' plus waste products trigger ', 'algal blooms', '. When those blooms die off, they ', 'decompose', ' and ', 'deplete oxygen', ' from the water, which can ', 'suffocate', ' aquatic life. Chemical fertilizers in ', 'agricultural runoff', ' may be carried by rain or ', 'irrigation', ' into coastal waters. Ancient Hawaiian ponds captured ', 'nutrient-rich', ' runoff and used ', 'tidal flushing', ' to remove waste. Special ', 'sluice gates', ' allowed ', 'juvenile fish', ' to enter and ', 'fatten up', ' but kept them from escaping once they ', 'matured', '.'
  ]
};
