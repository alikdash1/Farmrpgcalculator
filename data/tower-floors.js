// Per floor: [floor, gms[], mms[]] — the masteries you must ALREADY HOLD to
// unlock that floor. gms are the Grand Masteries required, mms the Mega
// Masteries required. Each entry is [name, image URL].
//
// Source: the official Farm RPG "Tower MM" wiki
// (https://farmrpg.com/#!/wiki.php?page=Tower+MM), read 2026-09-03. The wiki's
// floor table ends at T340, so there is no T341–T350 data to show. Silver cost
// is intentionally not listed here — this file is about what a floor requires,
// not what it costs in silver.
//
// Floor 300 comes from the wiki's 201–300 table (a single "Mega Masteries
// Needed" column); 301–340 come from its 301–340 table, which splits the
// requirement into "GMs Required" and "MMs Required".
window.FRPG_TOWER_FLOORS = {
  updated: "2026-09-03",
  source: "https://farmrpg.com/#!/wiki.php?page=Tower+MM",
  itemsAre: "requirements",
  note: "Masteries you must already hold to unlock each floor. From the official Tower MM wiki, which lists floors up to T340. Silver cost omitted on purpose.",
  floors: [
    [300,[],[['Wizard Hat','https://farmrpg.com/img/items/4798.png'],['Sewing Needle','https://farmrpg.com/img/items/needle.png'],['Water Lily','https://farmrpg.com/img/items/3258.png']]],
    [301,[['Corn Oil','https://farmrpg.com/img/items/cornoil.png'],['Cotton','https://farmrpg.com/img/items/8311.png'],['Basic Pillow','https://farmrpg.com/img/items/basicpillow.png']],[]],
    [302,[],[['Slimeback','https://farmrpg.com/img/items/slimeback.png'],['Splatfish','https://farmrpg.com/img/items/splatterfish.png'],['Magenta Growth','https://farmrpg.com/img/items/afk_8827.png']]],
    [303,[],[['Boghead Snapper','https://farmrpg.com/img/items/afk_8800.png'],['Bog Barnacle','https://farmrpg.com/img/items/382.png'],['Slime Egg Shell','https://farmrpg.com/img/items/afk_8847.png']]],
    [304,[['Leather Belt','https://farmrpg.com/img/items/finp_705.png'],['Brown Dye','https://farmrpg.com/img/items/browndye.png'],['Oak Table','https://farmrpg.com/img/items/Oak_table_.png']],[]],
    [305,[['Yellow Dye','https://farmrpg.com/img/items/yellowdye.png'],['Canoe','https://farmrpg.com/img/items/554.png'],['Gold Ruby Ring','https://farmrpg.com/img/items/goldrubyring.png']],[]],
    [306,[['Crown of Clover','https://farmrpg.com/img/items/Crownofclover.png'],['Cloth','https://farmrpg.com/img/items/690.png'],['Yellow Shirt','https://farmrpg.com/img/items/yellowshirt.png']],[]],
    [307,[['Orange Scarf','https://farmrpg.com/img/items/orangescarf.png'],['Crab Claw','https://farmrpg.com/img/items/crabclaw.png'],['White Dye','https://farmrpg.com/img/items/whitedye.png']],[]],
    [308,[['Veggie Juice','https://farmrpg.com/img/items/8879.png'],['Bamboo Rope','https://farmrpg.com/img/items/rope_t_01.png']],[['Glass Eye Urchin','https://farmrpg.com/img/items/afk_8843.png']]],
    [309,[['Tin Scraps','https://farmrpg.com/img/items/tinscraps.png'],['Bamboo Trellis','https://farmrpg.com/img/items/bambootrellis.png'],['Silk','https://farmrpg.com/img/items/silk.png']],[]],
    [310,[['Tie Dye Scarf','https://farmrpg.com/img/items/tiedyescarf2.png'],['Gazebo','https://farmrpg.com/img/items/Gazebo.png'],['Gold Garnet Ring','https://farmrpg.com/img/items/goldgarnetring.png']],[]],
    [311,[['Bamboo Chair','https://farmrpg.com/img/items/bamboochair.png'],['Barbed Wire','https://farmrpg.com/img/items/barbedwire.png']],[]],
    [312,[['Yellow Scarf','https://farmrpg.com/img/items/yellowscarf.png'],['Fire Ant Farm','https://farmrpg.com/img/items/antfarm.png?1']],[]],
    [313,[['Step Ladder','https://farmrpg.com/img/items/211.png'],['Orange Shirt','https://farmrpg.com/img/items/orangeshirt.png']],[]],
    [314,[['Energy Coil','https://farmrpg.com/img/items/9379b.png'],['Black Dye','https://farmrpg.com/img/items/blackdye.png']],[]],
    [315,[['Reinforced Helmet','https://farmrpg.com/img/items/9096.png'],['Gold Lemon Quartz Ring','https://farmrpg.com/img/items/goldlqring.png'],['Steel Vise','https://farmrpg.com/img/items/199.png']],[]],
    [316,[['Yellow Bag','https://farmrpg.com/img/items/yellowbag.png'],['Leather Helmet','https://farmrpg.com/img/items/afk_9140.png']],[]],
    [317,[['Gold Aquamarine Ring','https://farmrpg.com/img/items/goldaqring.png'],['Handsaw','https://farmrpg.com/img/items/3149.png']],[]],
    [318,[['Yellow Butterfly','https://farmrpg.com/img/items/yellowbutterfly.png'],['Acorn Butter','https://farmrpg.com/img/items/Acorn_butter.png']],[]],
    [319,[['Strong Paste','https://farmrpg.com/img/items/strongpaste.png']],[['Spoon','https://farmrpg.com/img/items/2473.png']]],
    [320,[['Corn Husk Doll','https://farmrpg.com/img/items/856.png']],[['Blubberfish','https://farmrpg.com/img/items/finp_415.png'],['Reaver Claw','https://farmrpg.com/img/items/293.png']]],
    [321,[],[['Green Diary','https://farmrpg.com/img/items/greenbook.png'],['Sturdy Bow','https://farmrpg.com/img/items/4765.png']]],
    [322,[['Power Monitor','https://farmrpg.com/img/items/9314.png'],['Bamboo Fence','https://farmrpg.com/img/items/bamboofence.png']],[]],
    [323,[['Spiked Shell','https://farmrpg.com/img/items/spikey.png'],['Black Scarf','https://farmrpg.com/img/items/blackscarf.png']],[]],
    [324,[['Spool of Copper','https://farmrpg.com/img/items/9324.png']],[['Red Twine','https://farmrpg.com/img/items/1621.png']]],
    [325,[],[['Cloth','https://farmrpg.com/img/items/690.png'],['Gold Ring','https://farmrpg.com/img/items/goldring.png'],['Tin Scraps','https://farmrpg.com/img/items/tinscraps.png']]],
    [326,[['Red Shirt','https://farmrpg.com/img/items/redshirt.png'],['Black Shirt','https://farmrpg.com/img/items/blackshirt.png']],[]],
    [327,[['Propeller Hat','https://farmrpg.com/img/items/Propeller_hat.png']],[['Blue Twine','https://farmrpg.com/img/items/bluetwine.png']]],
    [328,[['Wine','https://farmrpg.com/img/items/wine.png']],[['Sunflower','https://farmrpg.com/img/items/sunflower.png']]],
    [329,[['Pair of Boots','https://farmrpg.com/img/items/pboot2.png'],['Black Twine','https://farmrpg.com/img/items/blacktwine.png']],[]],
    [330,[['Red Diary','https://farmrpg.com/img/items/reddiary.png'],['White Twine','https://farmrpg.com/img/items/whitetwine.png'],['Magus Hat','https://farmrpg.com/img/items/5404.png']],[]],
    [331,[['Runestone 04','https://farmrpg.com/img/items/rs4.png'],['Orange Twine','https://farmrpg.com/img/items/orangetwine.png']],[]],
    [332,[['Kill Switch','https://farmrpg.com/img/items/9311.png']],[['Linked Lantern','https://farmrpg.com/img/items/mlantern.png?1']]],
    [333,[['Brown Cloak','https://farmrpg.com/img/items/browncloak.png'],['Glowing Lantern','https://farmrpg.com/img/items/glowinglantern.png']],[]],
    [334,[['Grand Piano','https://farmrpg.com/img/items/piano.png']],[['Oak Table','https://farmrpg.com/img/items/Oak_table_.png']]],
    [335,[['Red Brick','https://farmrpg.com/img/items/redbrick2.png']],[['Iced Tea','https://farmrpg.com/img/items/tea.png'],['Leather Belt','https://farmrpg.com/img/items/finp_705.png']]],
    [336,[['Yellow Twine','https://farmrpg.com/img/items/yellowtwine.png'],['Black Bag','https://farmrpg.com/img/items/blackbag.png']],[['Seaweed','https://farmrpg.com/img/items/fishing_75_t.png']]],
    [337,[['White Scarf','https://farmrpg.com/img/items/whitescarf.png'],['Orange Dye','https://farmrpg.com/img/items/orangedye.png']],[['Purple Twine','https://farmrpg.com/img/items/purpletwine.png']]],
    [338,[['Frost Shield','https://farmrpg.com/img/items/frostshield.png?1'],['Mayonnaise','https://farmrpg.com/img/items/mayo.png']],[['Orange Scarf','https://farmrpg.com/img/items/orangescarf.png']]],
    [339,[['Black Purse','https://farmrpg.com/img/items/blackpurse.png'],['Fancy Violin','https://farmrpg.com/img/items/finp_618.png?1'],['Brown Bag','https://farmrpg.com/img/items/brownbag.png']],[]],
    [340,[['White Purse','https://farmrpg.com/img/items/whitepurse.png']],[['Yellow Dye','https://farmrpg.com/img/items/yellowdye.png'],['Purple Diary','https://farmrpg.com/img/items/purplebook.png']]]
  ].map(([floor, gms, mms]) => ({
    floor,
    gms: gms.map(([name, img]) => ({ name, img })),
    mms: mms.map(([name, img]) => ({ name, img })),
  })),
};
