// Mining drops visible in the player's current Farm RPG location captures.
(() => {
  const catalog = window.FRPG_NEW_ITEMS;
  if (!catalog) return;
  const rows = [
    [855,"Unpolished Aquacite","1525.PNG","unpolished-aquacite","Crystalized Water"],
    [910,"Fossilized Frog","1896.PNG","fossilized-frog","This poor frog"],
    [918,"Stone Shell","stoneshell.png","stone-shell","From a stone turtle?"],
    [919,"Fossilized Leaf","2836.png","fossilized-leaf","A very old leaf"],
    [926,"Unpolished Flarite","uflarite.png","unpolished-flarite","Crystalized Fire"],
    [928,"Pitviper Tail","9478.png","pitviper-tail","Wide as a thigh and the length of three men"],
    [931,"Fossilized Shell","1672.png","fossilized-shell","A very old shell"],
    [930,"Runestone 27","rs27.png","runestone-27","Found in underground lava"],
    [1114,"Unpolished Pyrite","upyrite.png","unpolished-pyrite","Strangely cube shaped"],
    [1117,"Blood Crystal","2429.png","blood-crystal","Not actually blood"],
    [1118,"Nightshade Cap","6594.png","nightshade-cap","Black as your soul"],
    [1119,"Rune Shard","3476.png","rune-shard","What could it mean?"],
    [1120,"Broken Bangle","9090.png","broken-bangle","A promise broken"],
    [1122,"Fenrir's Coin","4173.png","fenrir-s-coin","Very valuable"],
    [857,"Fossilized Print","2125.PNG","fossilized-print","A print from an ancient creature"]
  ];
  const known = new Set(catalog.items.map(item => item.name));
  for (const [id,name,image,slug,description] of rows) {
    if (known.has(name)) continue;
    catalog.items.push({id,name,image:`https://farmrpg.com/img/items/${image}`,description,group:"mining",canCraft:false,newCraft:false,craftingLevel:0,buddyUrl:`https://buddy.farm/i/${slug}/`,sources:[{type:"mining",label:"Mining",confidence:"player-current-capture"}],recipe:[],usedIn:[]});
    known.add(name);
  }
  const mineItems = (window.FRPG_LOCATION_INTEL?.mining?.mines || []).flatMap(mine => mine.items);
  for (const name of mineItems) {
    if (known.has(name)) continue;
    const base = catalog.connected[name];
    if (!base) continue;
    catalog.items.push({...base,description:base.description||"Mining material",group:"mining",canCraft:false,newCraft:false,craftingLevel:0,sources:base.sources?.length?base.sources:[{type:"mining",label:"Mining",confidence:"player-current-capture"}],recipe:[],usedIn:[]});
    known.add(name);
  }
  catalog.meta.releaseItems = catalog.items.length;
})();


