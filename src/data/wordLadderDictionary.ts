import { WordLadderPuzzle } from '../types';

/**
 * Static dictionary of 4-letter English words for Henry Word Ladder.
 * Loaded locally for instant validation and zero external latency.
 */
export const WORD_LADDER_DICTIONARY: string[] = ["AAHS", "AALS", "AANI", "AARU", "ABAC", "ABAS", "ABBA", "ABBE", "ABBS", "ABBY", "ABED", "ABEL", "ABET", "ABEY", "ABID", "ABIE", "ABIR", "ABLE", "ABLY", "ABOS", "ABOX", "ABRI", "ABSI", "ABUT", "ABYE", "ABYS", "ACAI", "ACCA", "ACED", "ACER", "ACES", "ACHE", "ACHY", "ACID", "ACIS", "ACLE", "ACME", "ACNE", "ACOR", "ACRE", "ACTA", "ACTS", "ACTU", "ACYL", "ADAD", "ADAI", "ADAM", "ADAR", "ADAT", "ADAW", "ADAY", "ADDA", "ADDS", "ADDU", "ADDY", "ADET", "ADIB", "ADIN", "ADIT", "ADMI", "ADOS", "ADRY", "ADZE", "AEON", "AERO", "AERY", "AESC", "AFAR", "AFFA", "AFFY", "AFRO", "AGAG", "AGAL", "AGAO", "AGAR", "AGAS", "AGAU", "AGAZ", "AGED", "AGEE", "AGEN", "AGER", "AGES", "AGHA", "AGIB", "AGIN", "AGIO", "AGLA", "AGLU", "AGLY", "AGMA", "AGOG", "AGON", "AGRA", "AGRE", "AGUA", "AGUE", "AHED", "AHEM", "AHET", "AHEY", "AHIR", "AHIS", "AHOM", "AHOY", "AHUM", "AIAS", "AIDE", "AIDS", "AIEL", "AIGA", "AILE", "AILS", "AIMS", "AINE", "AINS", "AINT", "AINU", "AION", "AIRA", "AIRE", "AIRN", "AIRS", "AIRT", "AIRY", "AITS", "AITU", "AJAR", "AJEE", "AJOG", "AKAL", "AKAN", "AKED", "AKEE", "AKES", "AKEY", "AKHA", "AKIA", "AKIM", "AKIN", "AKKA", "AKOV", "AKRA", "ALAE", "ALAN", "ALAP", "ALAR", "ALAS", "ALAY", "ALBA", "ALBE", "ALBI", "ALBS", "ALCA", "ALCO", "ALEA", "ALEC", "ALEE", "ALEF", "ALEM", "ALEN", "ALES", "ALEW", "ALEX", "ALFA", "ALFS", "ALGA", "ALGY", "ALIF", "ALIN", "ALIT", "ALIX", "ALKO", "ALKY", "ALLE", "ALLS", "ALLY", "ALMA", "ALME", "ALMS", "ALOD", "ALOE", "ALOP", "ALOW", "ALPS", "ALSO", "ALTO", "ALTS", "ALUM", "ALUR", "ALYA", "AMAH", "AMAR", "AMAS", "AMBA", "AMBO", "AMEN", "AMEX", "AMIA", "AMIC", "AMID", "AMIE", "AMIL", "AMIN", "AMIR", "AMIS", "AMLA", "AMLI", "AMMA", "AMMI", "AMMO", "AMMU", "AMOK", "AMOR", "AMOS", "AMOY", "AMPS", "AMRA", "AMUS", "AMYL", "ANAL", "ANAM", "ANAN", "ANAS", "ANAT", "ANAX", "ANAY", "ANBA", "ANCE", "ANDA", "ANDE", "ANDI", "ANDS", "ANDY", "ANES", "ANEW", "ANGA", "ANGO", "ANIL", "ANIS", "ANKH", "ANNA", "ANNE", "ANNO", "ANNS", "ANOA", "ANON", "ANOW", "ANSA", "ANSU", "ANTA", "ANTE", "ANTI", "ANTS", "ANTU", "ANUS", "AOUL", "APAR", "APAY", "APED", "APER", "APES", "APEX", "APII", "APIO", "APIS", "APOD", "APOS", "APPS", "APSE", "APSO", "APTS", "APUS", "AQUA", "AQUO", "ARAB", "ARAD", "ARAK", "ARAR", "ARBA", "ARBS", "ARCA", "ARCH", "ARCO", "ARCS", "ARDS", "ARDU", "AREA", "ARED", "AREG", "ARES", "ARET", "AREW", "ARFS", "ARGO", "ARIA", "ARID", "ARIL", "ARIS", "ARKS", "ARLE", "ARMS", "ARMY", "ARNA", "ARNE", "ARNI", "AROW", "ARPA", "ARRY", "ARSE", "ARSY", "ARTI", "ARTS", "ARTY", "ARUI", "ARUM", "ARVO", "ARYA", "ARYL", "ASAK", "ASAR", "ASCI", "ASEA", "ASEM", "ASHA", "ASHY", "ASKR", "ASKS", "ASOK", "ASOP", "ASOR", "ASPS", "ASSE", "ASSI", "ASTA", "ATAP", "ATEF", "ATEN", "ATES", "ATIK", "ATIP", "ATIS", "ATKA", "ATLE", "ATMA", "ATMO", "ATOC", "ATOK", "ATOM", "ATOP", "ATRY", "ATTA", "ATUA", "ATWO", "AUBE", "AUCA", "AUFS", "AUGE", "AUGH", "AUKS", "AULA", "AULD", "AULU", "AUNE", "AUNT", "AURA", "AUSU", "AUTE", "AUTO", "AVAL", "AVAR", "AVAS", "AVEL", "AVER", "AVES", "AVID", "AVIS", "AVOS", "AVOW", "AWAG", "AWAN", "AWAT", "AWAY", "AWDL", "AWED", "AWEE", "AWES", "AWFU", "AWIN", "AWLS", "AWNS", "AWNY", "AWOL", "AWRY", "AXAL", "AXED", "AXEL", "AXES", "AXIL", "AXIS", "AXLE", "AXON", "AYAH", "AYES", "AYIN", "AYRE", "AYUS", "AZAN", "AZHA", "AZON", "AZOX", "AZYM", "BAAL", "BAAR", "BAAS", "BABA", "BABE", "BABI", "BABS", "BABU", "BABY", "BACH", "BACK", "BACS", "BADE", "BADS", "BAEL", "BAFF", "BAFT", "BAGA", "BAGH", "BAGO", "BAGS", "BAHO", "BAHT", "BAIL", "BAIN", "BAIS", "BAIT", "BAJU", "BAKA", "BAKE", "BAKU", "BALA", "BALD", "BALE", "BALI", "BALK", "BALL", "BALM", "BALS", "BALT", "BALU", "BAMS", "BANA", "BANC", "BAND", "BANE", "BANG", "BANI", "BANK", "BANS", "BANT", "BAPS", "BAPU", "BARA", "BARB", "BARD", "BARE", "BARF", "BARI", "BARK", "BARM", "BARN", "BARP", "BARS", "BART", "BARU", "BASE", "BASH", "BASK", "BASS", "BAST", "BATE", "BATH", "BATS", "BATT", "BATZ", "BAUD", "BAUK", "BAUL", "BAUN", "BAUR", "BAWD", "BAWL", "BAWN", "BAWR", "BAYA", "BAYE", "BAYS", "BAYT", "BAZE", "BEAD", "BEAK", "BEAL", "BEAM", "BEAN", "BEAR", "BEAT", "BEAU", "BECK", "BEDE", "BEDS", "BEDU", "BEEF", "BEEK", "BEEN", "BEEP", "BEER", "BEES", "BEET", "BEGO", "BEGS", "BEHN", "BEID", "BEIN", "BEJA", "BELA", "BELD", "BELL", "BELS", "BELT", "BELY", "BEMA", "BENA", "BEND", "BENE", "BENG", "BENI", "BENJ", "BENN", "BENO", "BENS", "BENT", "BENU", "BERE", "BERG", "BERI", "BERK", "BERM", "BERN", "BERT", "BESA", "BESS", "BEST", "BETA", "BETE", "BETH", "BETS", "BEVY", "BEYS", "BHAR", "BHAT", "BHEL", "BHIL", "BHOY", "BHUT", "BIAS", "BIBB", "BIBI", "BIBS", "BICE", "BICK", "BIDE", "BIDI", "BIDS", "BIEN", "BIER", "BIFF", "BIGA", "BIGG", "BIGS", "BIJA", "BIKE", "BIKH", "BILE", "BILK", "BILL", "BILO", "BIMA", "BIND", "BINE", "BING", "BINH", "BINI", "BINK", "BINO", "BINS", "BINT", "BIOD", "BIOG", "BION", "BIOS", "BIRD", "BIRI", "BIRK", "BIRL", "BIRN", "BIRO", "BIRR", "BISE", "BISH", "BISK", "BIST", "BITE", "BITI", "BITO", "BITS", "BITT", "BIWA", "BIXA", "BIZE", "BIZZ", "BLAB", "BLAD", "BLAE", "BLAG", "BLAH", "BLAM", "BLAN", "BLAS", "BLAT", "BLAW", "BLAY", "BLEB", "BLED", "BLEE", "BLEO", "BLET", "BLEW", "BLEY", "BLIN", "BLIP", "BLOB", "BLOC", "BLOG", "BLOT", "BLOW", "BLUB", "BLUE", "BLUP", "BLUR", "BOAB", "BOAK", "BOAR", "BOAS", "BOAT", "BOBA", "BOBO", "BOBS", "BOCE", "BOCK", "BODE", "BODO", "BODS", "BODY", "BOEP", "BOER", "BOET", "BOFF", "BOGA", "BOGO", "BOGS", "BOGY", "BOHO", "BOHS", "BOID", "BOII", "BOIL", "BOIS", "BOJO", "BOKE", "BOKO", "BOKS", "BOLA", "BOLD", "BOLE", "BOLK", "BOLL", "BOLO", "BOLT", "BOMA", "BOMB", "BONA", "BOND", "BONE", "BONG", "BONI", "BONK", "BONY", "BOOB", "BOOD", "BOOF", "BOOH", "BOOK", "BOOL", "BOOM", "BOON", "BOOR", "BOOS", "BOOT", "BOPS", "BORA", "BORD", "BORE", "BORG", "BORH", "BORK", "BORM", "BORN", "BORO", "BORS", "BORT", "BOSC", "BOSE", "BOSH", "BOSK", "BOSN", "BOSS", "BOTA", "BOTE", "BOTH", "BOTS", "BOTT", "BOUD", "BOUK", "BOUN", "BOUT", "BOUW", "BOWK", "BOWL", "BOWR", "BOWS", "BOXY", "BOYD", "BOYF", "BOYG", "BOYO", "BOYS", "BOZA", "BOZO", "BRAB", "BRAD", "BRAE", "BRAG", "BRAK", "BRAM", "BRAN", "BRAS", "BRAT", "BRAW", "BRAY", "BRED", "BREE", "BREI", "BREN", "BRER", "BRET", "BREW", "BREY", "BRIE", "BRIG", "BRIK", "BRIM", "BRIN", "BRIO", "BRIS", "BRIT", "BROB", "BROD", "BROG", "BROO", "BROS", "BROT", "BROW", "BRRR", "BRUS", "BRUT", "BRUX", "BUAL", "BUAT", "BUBA", "BUBE", "BUBO", "BUBS", "BUBU", "BUCK", "BUDA", "BUDH", "BUDI", "BUDO", "BUDS", "BUFF", "BUFO", "BUGI", "BUGS", "BUHL", "BUHR", "BUIK", "BUKE", "BUKH", "BULB", "BULK", "BULL", "BULT", "BUMF", "BUMP", "BUMS", "BUNA", "BUND", "BUNG", "BUNK", "BUNN", "BUNS", "BUNT", "BUOY", "BURA", "BURB", "BURD", "BURE", "BURG", "BURI", "BURK", "BURL", "BURN", "BURO", "BURP", "BURR", "BURS", "BURT", "BURY", "BUSH", "BUSK", "BUSS", "BUST", "BUSY", "BUTE", "BUTS", "BUTT", "BUYS", "BUZZ", "BYDE", "BYEE", "BYES", "BYGO", "BYKE", "BYON", "BYRE", "BYRL", "BYTE", "BYTH", "CAAM", "CAAS", "CABA", "CABS", "CACA", "CACK", "CADE", "CADI", "CADS", "CAFE", "CAFF", "CAFH", "CAGE", "CAGN", "CAGS", "CAGY", "CAID", "CAIN", "CAKE", "CAKY", "CALF", "CALK", "CALL", "CALM", "CALO", "CALP", "CALX", "CAMA", "CAMB", "CAME", "CAMO", "CAMP", "CAMS", "CANA", "CAND", "CANE", "CANG", "CANK", "CANN", "CANS", "CANT", "CANY", "CAPA", "CAPE", "CAPH", "CAPI", "CAPO", "CAPS", "CARA", "CARB", "CARD", "CARE", "CARK", "CARL", "CARN", "CARO", "CARP", "CARR", "CARS", "CART", "CARY", "CASA", "CASE", "CASH", "CASK", "CASS", "CAST", "CATE", "CATS", "CAUF", "CAUK", "CAUL", "CAUM", "CAUP", "CAVA", "CAVE", "CAVY", "CAWK", "CAWS", "CAYS", "CAZA", "CEAS", "CECA", "CEDE", "CEDI", "CEES", "CEIL", "CELL", "CELS", "CELT", "CENS", "CENT", "CEPA", "CEPE", "CEPS", "CERE", "CERN", "CERO", "CERT", "CESS", "CEST", "CETE", "CETI", "CEYX", "CHAA", "CHAB", "CHAC", "CHAD", "CHAI", "CHAL", "CHAM", "CHAO", "CHAP", "CHAR", "CHAS", "CHAT", "CHAV", "CHAW", "CHAY", "CHEE", "CHEF", "CHEN", "CHER", "CHET", "CHEW", "CHEZ", "CHIA", "CHIB", "CHIC", "CHID", "CHIH", "CHIK", "CHIL", "CHIN", "CHIP", "CHIS", "CHIT", "CHIV", "CHIZ", "CHOB", "CHOC", "CHOG", "CHOL", "CHON", "CHOP", "CHOU", "CHOW", "CHUB", "CHUD", "CHUG", "CHUM", "CHUN", "CHUT", "CIAO", "CIDE", "CIDS", "CIEL", "CIGS", "CILL", "CINE", "CION", "CIPO", "CIRE", "CIRL", "CISE", "CIST", "CITE", "CITO", "CITS", "CITY", "CIVE", "CIXO", "CLAD", "CLAG", "CLAM", "CLAN", "CLAP", "CLAT", "CLAW", "CLAY", "CLED", "CLEE", "CLEF", "CLEG", "CLEM", "CLEP", "CLEW", "CLIO", "CLIP", "CLIT", "CLOD", "CLOG", "CLON", "CLOP", "CLOT", "CLOU", "CLOW", "CLOY", "CLUB", "CLUE", "COAK", "COAL", "COAN", "COAT", "COAX", "COBB", "COBS", "COCA", "COCH", "COCK", "COCO", "CODA", "CODE", "CODO", "CODS", "COED", "COFF", "COFT", "COGS", "COHO", "COIF", "COIL", "COIN", "COIR", "COIT", "COIX", "COKE", "COKY", "COLA", "COLD", "COLE", "COLI", "COLK", "COLL", "COLP", "COLS", "COLT", "COLY", "COMA", "COMB", "COME", "COMM", "COMP", "COMS", "COND", "CONE", "CONF", "CONI", "CONK", "CONN", "CONS", "CONY", "COOF", "COOK", "COOL", "COOM", "COON", "COOP", "COOS", "COOT", "COPA", "COPE", "COPR", "COPS", "COPT", "COPY", "CORA", "CORD", "CORE", "CORF", "CORK", "CORM", "CORN", "CORP", "CORS", "CORY", "COSE", "COSH", "COSS", "COST", "COSY", "COTE", "COTH", "COTO", "COTS", "COTT", "COUE", "COUL", "COUP", "COUR", "COVE", "COWK", "COWL", "COWP", "COWS", "COWY", "COXA", "COXY", "COYO", "COYS", "COZE", "COZY", "CRAB", "CRAG", "CRAM", "CRAN", "CRAP", "CRAW", "CRAX", "CRAY", "CREA", "CRED", "CREE", "CREM", "CREW", "CREX", "CRIB", "CRIC", "CRIG", "CRIM", "CRIN", "CRIS", "CRIT", "CROC", "CROG", "CROM", "CROP", "CROW", "CROY", "CRUD", "CRUE", "CRUM", "CRUS", "CRUX", "CUBA", "CUBE", "CUBI", "CUBS", "CUCK", "CUDS", "CUED", "CUES", "CUFF", "CUIF", "CUIR", "CUIT", "CUKE", "CULL", "CULM", "CULT", "CUMP", "CUNA", "CUNT", "CUON", "CUPS", "CURB", "CURD", "CURE", "CURF", "CURL", "CURN", "CURR", "CURS", "CURT", "CUSH", "CUSK", "CUSP", "CUSS", "CUTE", "CUTS", "CUVY", "CUYA", "CWMS", "CYAN", "CYKE", "CYMA", "CYME", "CYST", "CYTE", "CZAR", "DABB", "DABS", "DACE", "DACK", "DADA", "DADE", "DADO", "DADS", "DADU", "DAER", "DAES", "DAFF", "DAFT", "DAGO", "DAGS", "DAHL", "DAHS", "DAIL", "DAIN", "DAIS", "DAKS", "DALE", "DALI", "DALK", "DALS", "DALT", "DAMA", "DAME", "DAMN", "DAMP", "DAMS", "DANA", "DAND", "DANE", "DANG", "DANI", "DANK", "DANS", "DANT", "DAPS", "DARB", "DARD", "DARE", "DARG", "DARI", "DARK", "DARN", "DARR", "DART", "DASH", "DASI", "DATA", "DATE", "DATO", "DAUB", "DAUD", "DAUR", "DAUT", "DAUW", "DAVE", "DAVY", "DAWD", "DAWK", "DAWN", "DAWS", "DAWT", "DAYS", "DAZA", "DAZE", "DAZY", "DEAD", "DEAF", "DEAL", "DEAN", "DEAR", "DEAW", "DEBE", "DEBI", "DEBS", "DEBT", "DECK", "DECO", "DEDO", "DEED", "DEEK", "DEEM", "DEEN", "DEEP", "DEER", "DEES", "DEET", "DEEV", "DEFI", "DEFT", "DEFY", "DEGS", "DEGU", "DEID", "DEIF", "DEIL", "DEKE", "DELE", "DELF", "DELI", "DELL", "DELO", "DELS", "DELT", "DEME", "DEMI", "DEMO", "DEMY", "DENE", "DENI", "DENS", "DENT", "DENY", "DEPA", "DERE", "DERM", "DERN", "DERO", "DERV", "DESI", "DESK", "DESS", "DEUL", "DEUS", "DEVA", "DEVS", "DEWS", "DEWY", "DEXY", "DEYS", "DHAI", "DHAK", "DHAL", "DHAN", "DHAW", "DHOL", "DHOW", "DIAL", "DIAN", "DIAU", "DIBS", "DICE", "DICH", "DICK", "DICT", "DIDO", "DIDY", "DIEB", "DIED", "DIEL", "DIEM", "DIER", "DIES", "DIET", "DIFF", "DIFS", "DIGS", "DIKA", "DIKE", "DILL", "DILO", "DIME", "DIMP", "DIMS", "DINE", "DING", "DINK", "DINO", "DINS", "DINT", "DIOL", "DION", "DIPS", "DIPT", "DIRD", "DIRE", "DIRK", "DIRL", "DIRT", "DISA", "DISC", "DISH", "DISK", "DISS", "DITA", "DITE", "DITS", "DITT", "DITZ", "DIVA", "DIVE", "DIVI", "DIVS", "DIXI", "DIXY", "DJIN", "DOAB", "DOAT", "DOBE", "DOBS", "DOBY", "DOCK", "DOCO", "DOCS", "DODD", "DODE", "DODO", "DODS", "DOEG", "DOEK", "DOEN", "DOER", "DOES", "DOFF", "DOGE", "DOGS", "DOGY", "DOHS", "DOIT", "DOJO", "DOKE", "DOKO", "DOLA", "DOLE", "DOLI", "DOLL", "DOLS", "DOLT", "DOME", "DOMN", "DOMS", "DOMY", "DONA", "DONE", "DONG", "DONN", "DONS", "DONT", "DOOB", "DOOK", "DOOL", "DOOM", "DOON", "DOOR", "DOOS", "DOPA", "DOPE", "DOPS", "DOPY", "DORA", "DORB", "DORE", "DORI", "DORK", "DORM", "DORN", "DORP", "DORR", "DORS", "DORT", "DORY", "DOSA", "DOSE", "DOSH", "DOSS", "DOST", "DOTE", "DOTH", "DOTO", "DOTS", "DOTY", "DOUC", "DOUG", "DOUK", "DOUM", "DOUN", "DOUP", "DOUR", "DOUT", "DOUX", "DOVE", "DOWD", "DOWF", "DOWL", "DOWN", "DOWP", "DOWS", "DOWT", "DOXA", "DOXY", "DOYS", "DOZE", "DOZY", "DRAB", "DRAC", "DRAD", "DRAG", "DRAM", "DRAP", "DRAT", "DRAW", "DRAY", "DREE", "DREG", "DREK", "DREW", "DREY", "DRIB", "DRIP", "DROP", "DROW", "DRUB", "DRUG", "DRUM", "DRYS", "DSOS", "DUAD", "DUAL", "DUAN", "DUAR", "DUBB", "DUBS", "DUCE", "DUCI", "DUCK", "DUCO", "DUCT", "DUDE", "DUDS", "DUED", "DUEL", "DUER", "DUES", "DUET", "DUFF", "DUGS", "DUHR", "DUIM", "DUIT", "DUKA", "DUKE", "DULE", "DULL", "DULT", "DULY", "DUMA", "DUMB", "DUMP", "DUNE", "DUNG", "DUNK", "DUNS", "DUNT", "DUNY", "DUOS", "DUPE", "DUPS", "DURA", "DURE", "DURN", "DURO", "DURR", "DUSH", "DUSK", "DUST", "DUTY", "DWAM", "DYAD", "DYAK", "DYAS", "DYCE", "DYED", "DYER", "DYES", "DYKE", "DYNE", "DZHO", "DZOS", "EACH", "EALE", "EANS", "EARD", "EARL", "EARN", "EARS", "EASE", "EAST", "EASY", "EATH", "EATS", "EAUS", "EAUX", "EAVE", "EBBS", "EBEN", "EBOE", "EBON", "ECAD", "ECCA", "ECCE", "ECCO", "ECHE", "ECHO", "ECHT", "ECOD", "ECOS", "ECRU", "ECUS", "EDDA", "EDDO", "EDDY", "EDEA", "EDEN", "EDGE", "EDGY", "EDHS", "EDIT", "EDNA", "EECH", "EELS", "EELY", "EERY", "EEVN", "EFFS", "EFIK", "EFTS", "EGAD", "EGAL", "EGBA", "EGBO", "EGER", "EGGS", "EGGY", "EGIS", "EGMA", "EGOL", "EGOS", "EHED", "EHEU", "EIDE", "EIKS", "EILD", "EINA", "EINE", "EISH", "EJAM", "EJOO", "EKED", "EKER", "EKES", "EKKA", "EKOI", "ELAN", "ELDS", "ELFS", "ELHI", "ELIA", "ELKS", "ELLA", "ELLE", "ELLS", "ELMS", "ELMY", "ELOD", "ELON", "ELSA", "ELSE", "ELTS", "EMES", "EMEU", "EMIC", "EMIL", "EMIM", "EMIR", "EMIT", "EMMA", "EMMY", "EMOS", "EMPT", "EMUS", "EMYD", "EMYS", "ENAM", "ENDS", "ENES", "ENEW", "ENGS", "ENID", "ENIF", "ENKI", "ENOL", "ENOS", "ENOW", "ENSE", "ENUF", "ENVY", "EOAN", "EONS", "EORL", "EPEE", "EPHA", "EPIC", "EPOS", "EPPY", "ERAL", "ERAS", "ERED", "ERES", "EREV", "ERGO", "ERGS", "ERIA", "ERIC", "ERIE", "ERIK", "ERKS", "ERMA", "ERNE", "ERNS", "EROS", "ERRS", "ERSE", "ERST", "ERTH", "ERUC", "ERUV", "ERYX", "ESCA", "ESES", "ESKY", "ESNE", "ESOX", "ESPY", "ESSE", "ESTH", "ESTS", "ETAS", "ETAT", "ETCH", "ETEN", "ETHE", "ETHS", "ETIC", "ETNA", "ETTA", "ETUA", "ETUI", "ETYM", "EUGE", "EUGH", "EUKS", "EUOI", "EURO", "EVAN", "EVEA", "EVEN", "EVER", "EVES", "EVET", "EVIL", "EVOE", "EVOS", "EWER", "EWES", "EWKS", "EWRY", "EWTS", "EXAM", "EXEC", "EXED", "EXES", "EXIT", "EXON", "EXPO", "EXUL", "EYAH", "EYAS", "EYED", "EYEN", "EYER", "EYES", "EYEY", "EYNE", "EYOT", "EYRA", "EYRE", "EYRY", "EZBA", "EZRA", "FAAN", "FAAS", "FABA", "FABS", "FACE", "FACK", "FACT", "FACY", "FADE", "FADO", "FADS", "FADY", "FAFF", "FAGE", "FAGS", "FAHS", "FAIK", "FAIL", "FAIN", "FAIR", "FAIX", "FAKE", "FAKY", "FALL", "FALX", "FAMA", "FAME", "FANA", "FAND", "FANE", "FANG", "FANK", "FANO", "FANS", "FANT", "FANY", "FAON", "FARD", "FARE", "FARL", "FARM", "FARO", "FARS", "FART", "FASH", "FASS", "FAST", "FATE", "FATS", "FAUN", "FAUR", "FAUT", "FAUX", "FAVA", "FAVE", "FAVN", "FAWN", "FAWS", "FAYS", "FAZE", "FEAK", "FEAL", "FEAR", "FEAT", "FECK", "FEDS", "FEEB", "FEED", "FEEL", "FEEN", "FEER", "FEES", "FEET", "FEGS", "FEHM", "FEHS", "FEIF", "FEIL", "FEIS", "FELL", "FELS", "FELT", "FEME", "FEMS", "FEND", "FENI", "FENS", "FENT", "FEOD", "FERE", "FERK", "FERM", "FERN", "FERU", "FESS", "FEST", "FETA", "FETE", "FETS", "FETT", "FEUD", "FEUS", "FEYS", "FIAR", "FIAT", "FIBS", "FICE", "FICO", "FIDE", "FIDO", "FIDS", "FIEF", "FIER", "FIFE", "FIFI", "FIFO", "FIGO", "FIGS", "FIJI", "FIKE", "FIKY", "FILA", "FILE", "FILL", "FILM", "FILO", "FILS", "FIND", "FINE", "FINI", "FINK", "FINN", "FINO", "FINS", "FIOT", "FIRE", "FIRK", "FIRM", "FIRN", "FIRS", "FISC", "FISE", "FISH", "FISK", "FIST", "FITS", "FITT", "FIVE", "FIXT", "FIZZ", "FLAB", "FLAG", "FLAK", "FLAM", "FLAN", "FLAP", "FLAT", "FLAW", "FLAX", "FLAY", "FLEA", "FLED", "FLEE", "FLEG", "FLEM", "FLET", "FLEW", "FLEX", "FLEY", "FLIC", "FLIM", "FLIP", "FLIR", "FLIT", "FLIX", "FLOB", "FLOC", "FLOE", "FLOG", "FLOP", "FLOR", "FLOT", "FLOW", "FLUB", "FLUE", "FLUS", "FLUX", "FOAL", "FOAM", "FOBS", "FOCI", "FOEN", "FOES", "FOGO", "FOGS", "FOGY", "FOHN", "FOHS", "FOID", "FOIL", "FOIN", "FOLD", "FOLE", "FOLK", "FOND", "FONE", "FONO", "FONS", "FONT", "FOOD", "FOOL", "FOOT", "FOPS", "FORA", "FORB", "FORD", "FORE", "FORK", "FORM", "FORT", "FOSH", "FOSS", "FOUD", "FOUL", "FOUN", "FOUR", "FOUS", "FOWK", "FOWL", "FOXY", "FOYS", "FOZY", "FRAB", "FRAE", "FRAG", "FRAM", "FRAP", "FRAS", "FRAT", "FRAU", "FRAY", "FRED", "FREE", "FRET", "FRIB", "FRIG", "FRIM", "FRIS", "FRIT", "FRIZ", "FROE", "FROG", "FROM", "FROS", "FROT", "FROW", "FRUG", "FUBS", "FUCI", "FUCK", "FUDS", "FUEL", "FUFF", "FUGS", "FUGU", "FUJI", "FULK", "FULL", "FUME", "FUMS", "FUMY", "FUND", "FUNG", "FUNK", "FUNS", "FUNT", "FURL", "FURR", "FURS", "FURY", "FUSC", "FUSE", "FUSS", "FUST", "FUTE", "FUTZ", "FUYE", "FUZE", "FUZZ", "FYCE", "FYKE", "FYLE", "FYRD", "GABE", "GABI", "GABS", "GABY", "GADE", "GADI", "GADS", "GAED", "GAEL", "GAEN", "GAES", "GAET", "GAFF", "GAGA", "GAGE", "GAGS", "GAIA", "GAID", "GAIL", "GAIN", "GAIR", "GAIT", "GAJO", "GALA", "GALE", "GALI", "GALL", "GALP", "GALS", "GALT", "GAMA", "GAMB", "GAME", "GAMP", "GAMS", "GAMY", "GANE", "GANG", "GANS", "GANT", "GAOL", "GAON", "GAPA", "GAPE", "GAPO", "GAPS", "GAPY", "GARA", "GARB", "GARE", "GARI", "GARN", "GARO", "GARS", "GART", "GARY", "GASH", "GASP", "GAST", "GATA", "GATE", "GATH", "GATS", "GAUB", "GAUD", "GAUL", "GAUM", "GAUN", "GAUP", "GAUR", "GAUS", "GAUT", "GAVE", "GAWD", "GAWK", "GAWM", "GAWN", "GAWP", "GAYS", "GAZE", "GAZI", "GAZY", "GEAL", "GEAN", "GEAR", "GEAT", "GECK", "GEDS", "GEED", "GEEK", "GEEP", "GEES", "GEET", "GEEZ", "GEGG", "GEIN", "GEIT", "GELD", "GELL", "GELS", "GELT", "GEMS", "GENA", "GENE", "GENS", "GENT", "GENU", "GEON", "GEOS", "GERB", "GERE", "GERM", "GERS", "GERT", "GEST", "GETA", "GETS", "GEUM", "GHAN", "GHAT", "GHEE", "GHEG", "GHIS", "GHUZ", "GIBE", "GIBS", "GIDS", "GIED", "GIEN", "GIES", "GIFT", "GIGA", "GIGI", "GIGS", "GILA", "GILD", "GILL", "GILO", "GILT", "GIMP", "GING", "GINK", "GINN", "GINS", "GIOS", "GIPS", "GIRD", "GIRL", "GIRN", "GIRO", "GIRR", "GIRT", "GISH", "GISM", "GIST", "GITE", "GITH", "GITS", "GIVE", "GIZZ", "GJUS", "GLAD", "GLAM", "GLAR", "GLED", "GLEE", "GLEG", "GLEI", "GLEN", "GLEY", "GLIA", "GLIB", "GLID", "GLIM", "GLIS", "GLIT", "GLOB", "GLOM", "GLOP", "GLOR", "GLOW", "GLOY", "GLUB", "GLUE", "GLUG", "GLUM", "GLUT", "GNAR", "GNAT", "GNAW", "GNOW", "GNUS", "GOAD", "GOAF", "GOAL", "GOAN", "GOAS", "GOAT", "GOBI", "GOBO", "GOBS", "GOBY", "GODE", "GODS", "GOEL", "GOER", "GOES", "GOEY", "GOFF", "GOGO", "GOLA", "GOLD", "GOLE", "GOLF", "GOLI", "GOLL", "GOLO", "GOLP", "GOMA", "GONA", "GOND", "GONE", "GONG", "GONK", "GONS", "GONY", "GOOD", "GOOF", "GOOG", "GOOK", "GOOL", "GOON", "GOOP", "GOOR", "GOOS", "GORA", "GORB", "GORE", "GORI", "GORM", "GORP", "GORY", "GOSH", "GOSS", "GOTE", "GOTH", "GOUK", "GOUP", "GOUT", "GOVE", "GOVS", "GOWD", "GOWF", "GOWK", "GOWL", "GOWN", "GOYS", "GRAB", "GRAD", "GRAM", "GRAN", "GRAT", "GRAV", "GRAY", "GREE", "GREG", "GREN", "GREW", "GREX", "GREY", "GRID", "GRIG", "GRIM", "GRIN", "GRIP", "GRIS", "GRIT", "GROG", "GROK", "GROS", "GROT", "GROW", "GRUB", "GRUE", "GRUM", "GRUN", "GRUS", "GUAN", "GUAO", "GUAR", "GUBS", "GUCK", "GUDE", "GUES", "GUFA", "GUFF", "GUGA", "GUGU", "GUHA", "GUHR", "GUIB", "GUID", "GULA", "GULE", "GULF", "GULL", "GULO", "GULP", "GULS", "GULY", "GUMP", "GUMS", "GUNA", "GUNG", "GUNJ", "GUNK", "GUNL", "GUNS", "GUNZ", "GUPS", "GURK", "GURL", "GURN", "GURR", "GURS", "GURT", "GURU", "GUSH", "GUSS", "GUST", "GUTI", "GUTS", "GUTT", "GUVS", "GUYS", "GUZE", "GWAG", "GWEN", "GYAL", "GYBE", "GYLE", "GYMP", "GYMS", "GYNE", "GYNY", "GYPE", "GYPS", "GYRE", "GYRI", "GYRO", "GYTE", "GYVE", "HAAB", "HAAF", "HAAR", "HABE", "HABU", "HACK", "HADE", "HADJ", "HADS", "HAEC", "HAED", "HAEM", "HAEN", "HAES", "HAET", "HAFF", "HAFT", "HAGG", "HAGI", "HAGS", "HAHA", "HAHS", "HAIK", "HAIL", "HAIN", "HAIR", "HAJE", "HAJI", "HAJJ", "HAKA", "HAKE", "HAKO", "HAKU", "HALA", "HALE", "HALF", "HALL", "HALM", "HALO", "HALS", "HALT", "HAME", "HAMI", "HAMS", "HAND", "HANG", "HANK", "HANO", "HANS", "HANT", "HAPI", "HAPS", "HAPU", "HARB", "HARD", "HARE", "HARK", "HARL", "HARM", "HARN", "HARO", "HARP", "HARR", "HART", "HARV", "HASH", "HASK", "HASP", "HAST", "HATE", "HATH", "HATI", "HATS", "HATT", "HAUD", "HAUF", "HAUL", "HAUT", "HAVE", "HAWK", "HAWM", "HAWS", "HAYA", "HAYS", "HAYZ", "HAZE", "HAZY", "HEAD", "HEAF", "HEAL", "HEAP", "HEAR", "HEAT", "HEBE", "HECH", "HECK", "HEED", "HEEL", "HEER", "HEFT", "HEHE", "HEHS", "HEID", "HEII", "HEIL", "HEIN", "HEIR", "HELD", "HELE", "HELL", "HELM", "HELO", "HELP", "HEME", "HEML", "HEMP", "HEMS", "HEND", "HENS", "HENT", "HEPS", "HEPT", "HERB", "HERD", "HERE", "HERL", "HERM", "HERN", "HERO", "HERS", "HERY", "HESP", "HEST", "HETE", "HETH", "HETS", "HEVI", "HEWN", "HEWS", "HEWT", "HEXA", "HEYS", "HICK", "HIDE", "HIED", "HIES", "HIGH", "HIKE", "HILA", "HILD", "HILI", "HILL", "HILT", "HIMA", "HIMP", "HIMS", "HIND", "HING", "HINS", "HINT", "HIOI", "HIPE", "HIPS", "HIPT", "HIRE", "HIRO", "HISH", "HISN", "HISS", "HIST", "HITS", "HIVE", "HIYA", "HIZZ", "HLER", "HOAR", "HOAS", "HOAX", "HOBO", "HOBS", "HOCK", "HODS", "HOED", "HOER", "HOES", "HOGA", "HOGG", "HOGH", "HOGS", "HOHA", "HOHE", "HOHN", "HOHS", "HOIK", "HOIN", "HOIT", "HOJU", "HOKA", "HOKE", "HOKI", "HOLD", "HOLE", "HOLK", "HOLL", "HOLM", "HOLP", "HOLS", "HOLT", "HOLY", "HOMA", "HOME", "HOMO", "HOMS", "HOMY", "HOND", "HONE", "HONG", "HONK", "HONS", "HOOD", "HOOF", "HOOK", "HOON", "HOOP", "HOOT", "HOPE", "HOPI", "HOPS", "HORA", "HORE", "HORI", "HORN", "HORS", "HORY", "HOSE", "HOSS", "HOST", "HOTE", "HOTI", "HOTS", "HOUF", "HOUR", "HOUT", "HOVA", "HOVE", "HOWE", "HOWF", "HOWK", "HOWL", "HOWS", "HOYA", "HOYS", "HUBB", "HUBS", "HUCK", "HUED", "HUER", "HUES", "HUEY", "HUFF", "HUGE", "HUGH", "HUGO", "HUGS", "HUGY", "HUHU", "HUIA", "HUIC", "HUIS", "HUKE", "HULA", "HULE", "HULK", "HULL", "HULU", "HUMA", "HUME", "HUMF", "HUMP", "HUMS", "HUNG", "HUNH", "HUNK", "HUNS", "HUNT", "HUPA", "HUPS", "HURA", "HURE", "HURF", "HURL", "HURR", "HURT", "HUSE", "HUSH", "HUSK", "HUSO", "HUSS", "HUTS", "HUZZ", "HWAN", "HWYL", "HYED", "HYEN", "HYES", "HYKE", "HYLA", "HYLE", "HYMN", "HYNE", "HYPE", "HYPO", "HYPS", "HYTE", "IAMB", "IBAD", "IBAN", "IBEX", "IBID", "IBIS", "ICED", "ICER", "ICES", "ICEY", "ICHO", "ICHS", "ICHU", "ICKY", "ICON", "IDEA", "IDEE", "IDEM", "IDES", "IDIC", "IDLE", "IDLY", "IDOL", "IDYL", "IFFY", "IGAD", "IGGS", "IGLU", "IIWI", "IJMA", "IKAN", "IKAT", "IKEY", "IKON", "IKRA", "ILEA", "ILEX", "ILIA", "ILKA", "ILKS", "ILLS", "ILLY", "ILOT", "ILYA", "IMAM", "IMBE", "IMER", "IMID", "IMMI", "IMMY", "IMPI", "IMPS", "IMPY", "INBE", "INBY", "INCA", "INCH", "INDE", "INDY", "INEZ", "INFO", "INGA", "INGO", "INIA", "INKS", "INKY", "INLY", "INNS", "INRO", "INTI", "INTO", "IODO", "IONE", "IONI", "IONS", "IOTA", "IOWA", "IPID", "IPIL", "IRAN", "IRAQ", "IRED", "IRES", "IRID", "IRIS", "IRKS", "IRMA", "IROK", "IRON", "ISBA", "ISIS", "ISIT", "ISLE", "ISMS", "ISMY", "ISNA", "ISOS", "ITAS", "ITCH", "ITEA", "ITEM", "ITEN", "ITER", "ITMO", "ITYS", "ITZA", "IURE", "IVAN", "IVIN", "IWIS", "IXIA", "IXIL", "IZAR", "IZLE", "IZZY", "JAAP", "JABS", "JACK", "JACU", "JADE", "JADY", "JAFA", "JAGA", "JAGG", "JAGS", "JAIL", "JAIN", "JAKE", "JAKO", "JAKS", "JAMA", "JAMB", "JAMI", "JAMS", "JANE", "JANK", "JANN", "JAOB", "JAPE", "JAPS", "JARA", "JARG", "JARK", "JARL", "JARP", "JARS", "JASP", "JASS", "JASY", "JATI", "JATO", "JAUK", "JAUN", "JAUP", "JAVA", "JAWS", "JAWY", "JAXY", "JAYS", "JAZY", "JAZZ", "JEAN", "JEAT", "JEDI", "JEED", "JEEL", "JEEP", "JEER", "JEES", "JEEZ", "JEFE", "JEFF", "JEHU", "JELL", "JEON", "JERK", "JERL", "JERM", "JERT", "JESS", "JEST", "JESU", "JETE", "JETS", "JEUX", "JEWS", "JEWY", "JHOW", "JIAO", "JIBB", "JIBE", "JIBI", "JIBS", "JIFF", "JIGS", "JILL", "JILT", "JIMP", "JINA", "JING", "JINK", "JINN", "JINS", "JINX", "JIRD", "JIRI", "JISM", "JITI", "JIVA", "JIVE", "JIVY", "JIZZ", "JOAN", "JOBE", "JOBO", "JOBS", "JOCH", "JOCK", "JOCO", "JOCU", "JODO", "JOEL", "JOES", "JOEY", "JOGS", "JOHN", "JOIN", "JOKE", "JOKY", "JOLE", "JOLL", "JOLS", "JOLT", "JOMO", "JONG", "JONI", "JOOK", "JOOM", "JOON", "JORS", "JOSE", "JOSH", "JOSS", "JOTA", "JOTS", "JOUG", "JOUK", "JOUR", "JOVA", "JOVE", "JOWL", "JOWS", "JOYS", "JOZY", "JUAN", "JUBA", "JUBE", "JUCK", "JUCO", "JUDE", "JUDO", "JUDS", "JUDY", "JUGA", "JUGS", "JUHA", "JUJU", "JUKE", "JUKU", "JULE", "JULY", "JUMP", "JUNE", "JUNK", "JUNO", "JUNT", "JUPE", "JURA", "JURE", "JURI", "JURY", "JUST", "JUTE", "JUTS", "JUVE", "JUZA", "JYNX", "KAAL", "KAAS", "KABS", "KADE", "KADI", "KADU", "KAED", "KAES", "KAFA", "KAFS", "KAGO", "KAGU", "KAHA", "KAHU", "KAID", "KAIE", "KAIF", "KAIK", "KAIL", "KAIM", "KAIN", "KAIS", "KAKA", "KAKI", "KAKS", "KALA", "KALE", "KALI", "KALO", "KAMA", "KAME", "KAMI", "KANA", "KANE", "KANG", "KANS", "KANT", "KAON", "KAPA", "KAPH", "KAPP", "KARA", "KARI", "KARK", "KARL", "KARN", "KARO", "KART", "KASA", "KASM", "KATA", "KATE", "KATH", "KATI", "KATS", "KATY", "KAVA", "KAVI", "KAWA", "KAWS", "KAYO", "KAYS", "KAZI", "KBAR", "KEAS", "KEBS", "KECK", "KEDS", "KEEF", "KEEK", "KEEL", "KEEN", "KEEP", "KEES", "KEET", "KEFS", "KEGS", "KEID", "KEIR", "KEKS", "KELD", "KELE", "KELK", "KELL", "KELP", "KELT", "KEMB", "KEMP", "KEND", "KENN", "KENO", "KENS", "KENT", "KEPI", "KEPS", "KEPT", "KERB", "KERF", "KERN", "KERO", "KESH", "KEST", "KETA", "KETE", "KETO", "KETS", "KETU", "KEUP", "KEWL", "KEXY", "KEYS", "KHAF", "KHAN", "KHAR", "KHAT", "KHET", "KHIR", "KHIS", "KHOR", "KHOT", "KHUD", "KIBE", "KIBY", "KICK", "KIDS", "KIEF", "KIEL", "KIER", "KIFF", "KIFS", "KIHO", "KIKE", "KIKI", "KIKU", "KILD", "KILL", "KILN", "KILO", "KILP", "KILT", "KINA", "KIND", "KINE", "KING", "KINK", "KINO", "KINS", "KIPE", "KIPP", "KIPS", "KIRI", "KIRK", "KIRN", "KIRS", "KISH", "KISS", "KIST", "KITE", "KITH", "KITS", "KIVA", "KIVU", "KIWI", "KIYI", "KLAM", "KLAN", "KLAP", "KLIK", "KLIP", "KLOM", "KLOP", "KMET", "KNAB", "KNAG", "KNAP", "KNAR", "KNEE", "KNET", "KNEW", "KNEZ", "KNIT", "KNOB", "KNOP", "KNOT", "KNOW", "KNUB", "KNUR", "KNUT", "KOAE", "KOAN", "KOAP", "KOAS", "KOBI", "KOBO", "KOBS", "KOBU", "KOCH", "KODA", "KOEL", "KOFF", "KOFT", "KOHA", "KOHL", "KOIL", "KOIS", "KOJI", "KOKO", "KOKU", "KOLA", "KOLI", "KOLO", "KOME", "KOMI", "KONA", "KOND", "KONK", "KONS", "KOOK", "KOPH", "KOPI", "KOPS", "KORA", "KORE", "KORI", "KORO", "KORS", "KORU", "KORY", "KOSO", "KOSS", "KOTA", "KOTO", "KOWS", "KOZO", "KRAB", "KRAG", "KRAL", "KRAN", "KRAS", "KRIS", "KROO", "KSAR", "KUAN", "KUAR", "KUBA", "KUDO", "KUDU", "KUEH", "KUEI", "KUES", "KUFI", "KUGE", "KUIA", "KUKI", "KUKU", "KULA", "KULI", "KULM", "KUNA", "KUNE", "KUNG", "KUNK", "KURD", "KURI", "KURT", "KURU", "KUSA", "KUTA", "KUTI", "KUTU", "KUZU", "KVAS", "KWAN", "KYAH", "KYAK", "KYAR", "KYAT", "KYBO", "KYES", "KYLE", "KYLO", "KYND", "KYNE", "KYPE", "KYTE", "KYUS", "LABS", "LACE", "LACK", "LACS", "LACY", "LADE", "LADS", "LADY", "LAER", "LAET", "LAGS", "LAHS", "LAIC", "LAID", "LAIK", "LAIN", "LAIR", "LAKE", "LAKH", "LAKY", "LALL", "LALO", "LAMA", "LAMB", "LAME", "LAMP", "LAMS", "LANA", "LAND", "LANE", "LANG", "LANK", "LANT", "LANX", "LAPP", "LAPS", "LARD", "LARE", "LARI", "LARK", "LARN", "LARS", "LASA", "LASE", "LASH", "LASI", "LASK", "LASS", "LAST", "LATA", "LATE", "LATH", "LATI", "LATS", "LATU", "LAUD", "LAUF", "LAUN", "LAUR", "LAVA", "LAVE", "LAVS", "LAWK", "LAWN", "LAWS", "LAYS", "LAZE", "LAZO", "LAZY", "LEAD", "LEAF", "LEAH", "LEAK", "LEAL", "LEAM", "LEAN", "LEAP", "LEAR", "LEAS", "LEAT", "LECH", "LECK", "LEDA", "LEDE", "LEED", "LEEK", "LEEP", "LEER", "LEES", "LEET", "LEFT", "LEGS", "LEHI", "LEHR", "LEIF", "LEIR", "LEIS", "LEKE", "LEKS", "LEKU", "LEME", "LENA", "LEND", "LENE", "LENG", "LENO", "LENS", "LENT", "LEON", "LEPA", "LEPS", "LEPT", "LERE", "LERP", "LESS", "LEST", "LETE", "LETO", "LETS", "LETT", "LEUD", "LEUK", "LEVA", "LEVE", "LEVI", "LEVO", "LEVY", "LEWD", "LEYS", "LEZZ", "LIAR", "LIAS", "LIBS", "LICE", "LICH", "LICK", "LIDA", "LIDE", "LIDO", "LIDS", "LIED", "LIEF", "LIEN", "LIER", "LIES", "LIEU", "LIFE", "LIFO", "LIFT", "LIGS", "LIIN", "LIJA", "LIKE", "LILA", "LILE", "LILL", "LILO", "LILT", "LILY", "LIMA", "LIMB", "LIME", "LIMN", "LIMO", "LIMP", "LIMU", "LIMY", "LINA", "LIND", "LINE", "LING", "LINK", "LINN", "LINO", "LINS", "LINT", "LINY", "LION", "LIPA", "LIPE", "LIPO", "LIPS", "LIRA", "LIRE", "LIRI", "LIRK", "LISA", "LISE", "LISH", "LISK", "LISP", "LISS", "LIST", "LITE", "LITH", "LITS", "LITU", "LITZ", "LIVE", "LIZA", "LLEU", "LLEW", "LLYN", "LOAD", "LOAF", "LOAM", "LOAN", "LOBE", "LOBI", "LOBO", "LOBS", "LOCA", "LOCH", "LOCI", "LOCK", "LOCO", "LODE", "LODS", "LOFT", "LOGE", "LOGO", "LOGS", "LOGY", "LOID", "LOIN", "LOIR", "LOIS", "LOKA", "LOKE", "LOLA", "LOLL", "LOLO", "LOMA", "LOME", "LONE", "LONG", "LONK", "LOOD", "LOOF", "LOOK", "LOOM", "LOON", "LOOP", "LOOR", "LOOS", "LOOT", "LOPE", "LOPS", "LORA", "LORD", "LORE", "LORI", "LORN", "LORO", "LORS", "LORY", "LOSE", "LOSH", "LOSS", "LOST", "LOTA", "LOTE", "LOTH", "LOTI", "LOTO", "LOTS", "LOUD", "LOUK", "LOUN", "LOUP", "LOUR", "LOUS", "LOUT", "LOVE", "LOWA", "LOWE", "LOWN", "LOWP", "LOWS", "LOWT", "LOWY", "LOYD", "LOYS", "LUAU", "LUBA", "LUBE", "LUCE", "LUCK", "LUCY", "LUDE", "LUDO", "LUDS", "LUES", "LUFF", "LUGE", "LUGS", "LUIS", "LUIT", "LUKE", "LULA", "LULL", "LULU", "LUMA", "LUMP", "LUMS", "LUNA", "LUNE", "LUNG", "LUNK", "LUNN", "LUNT", "LUNY", "LUPE", "LURA", "LURE", "LURG", "LURI", "LURK", "LURS", "LUSH", "LUSK", "LUST", "LUTE", "LUTZ", "LUVS", "LUXE", "LWEI", "LYAM", "LYAS", "LYCH", "LYES", "LYME", "LYMS", "LYNE", "LYNN", "LYNX", "LYON", "LYRA", "LYRE", "LYSE", "LYTE", "MAAM", "MAAR", "MAAS", "MABA", "MABE", "MABI", "MACE", "MACH", "MACK", "MACO", "MACS", "MADE", "MADI", "MADO", "MADS", "MAES", "MAGA", "MAGE", "MAGG", "MAGH", "MAGI", "MAGS", "MAHA", "MAHI", "MAIA", "MAID", "MAIK", "MAIL", "MAIM", "MAIN", "MAIR", "MAJA", "MAJO", "MAKE", "MAKI", "MAKO", "MAKS", "MAKU", "MALA", "MALE", "MALI", "MALL", "MALM", "MALO", "MALS", "MALT", "MAMA", "MAMO", "MAMS", "MANA", "MAND", "MANE", "MANG", "MANI", "MANK", "MANN", "MANO", "MANS", "MANT", "MANX", "MANY", "MAPO", "MAPS", "MARA", "MARC", "MARD", "MARE", "MARG", "MARI", "MARK", "MARL", "MARM", "MARO", "MARS", "MART", "MARU", "MARY", "MASA", "MASE", "MASH", "MASK", "MASS", "MAST", "MASU", "MATE", "MATH", "MATS", "MATT", "MATY", "MAUD", "MAUL", "MAUN", "MAUT", "MAUX", "MAWK", "MAWN", "MAWP", "MAWR", "MAWS", "MAXI", "MAYA", "MAYO", "MAYS", "MAZA", "MAZE", "MAZY", "MEAD", "MEAK", "MEAL", "MEAN", "MEAT", "MECK", "MEDE", "MEDS", "MEED", "MEEK", "MEER", "MEES", "MEET", "MEFF", "MEGA", "MEGS", "MEIN", "MEIO", "MELA", "MELD", "MELE", "MELL", "MELS", "MELT", "MEME", "MEMO", "MEMS", "MEND", "MENE", "MENG", "MENO", "MENT", "MENU", "MENY", "MEOU", "MEOW", "MERC", "MERE", "MERI", "MERK", "MERL", "MERO", "MESA", "MESE", "MESH", "MESO", "MESS", "META", "METE", "METH", "METS", "MEUM", "MEUS", "MEVE", "MEWL", "MEWS", "MEZE", "MEZZ", "MHOS", "MIAN", "MIAO", "MIAS", "MIBS", "MICA", "MICE", "MICH", "MICK", "MICO", "MICS", "MIDE", "MIDI", "MIDS", "MIEK", "MIEN", "MIFF", "MIGG", "MIGS", "MIHA", "MIHI", "MIJL", "MIKE", "MIKI", "MILA", "MILD", "MILE", "MILK", "MILL", "MILO", "MILS", "MILT", "MIMA", "MIME", "MIMI", "MIMP", "MINA", "MIND", "MINE", "MING", "MINI", "MINK", "MINO", "MINT", "MINX", "MINY", "MIPS", "MIRA", "MIRD", "MIRE", "MIRI", "MIRK", "MIRO", "MIRS", "MIRV", "MIRY", "MISE", "MISO", "MISS", "MIST", "MITE", "MITT", "MITU", "MITY", "MIXE", "MIXT", "MIXY", "MIZZ", "MNAS", "MOAI", "MOAN", "MOAS", "MOAT", "MOBE", "MOBS", "MOBY", "MOCH", "MOCK", "MOCS", "MODE", "MODI", "MODS", "MOED", "MOER", "MOES", "MOFF", "MOFO", "MOGO", "MOGS", "MOHA", "MOHO", "MOHR", "MOIL", "MOIO", "MOIT", "MOJO", "MOKE", "MOKI", "MOKO", "MOKY", "MOLA", "MOLD", "MOLE", "MOLL", "MOLS", "MOLT", "MOLY", "MOME", "MOMI", "MOMO", "MOMS", "MONA", "MONE", "MONG", "MONK", "MONO", "MONS", "MONT", "MONY", "MOOD", "MOOI", "MOOK", "MOOL", "MOON", "MOOP", "MOOR", "MOOS", "MOOT", "MOPE", "MOPH", "MOPS", "MOPY", "MORA", "MORE", "MORG", "MORN", "MORO", "MORS", "MORT", "MOSE", "MOSH", "MOSK", "MOSS", "MOST", "MOTE", "MOTH", "MOTI", "MOTS", "MOTT", "MOTU", "MOUD", "MOUE", "MOUL", "MOUP", "MOUS", "MOUT", "MOVE", "MOWA", "MOWN", "MOWS", "MOWT", "MOXA", "MOXO", "MOYA", "MOYL", "MOYO", "MOYS", "MOZE", "MOZO", "MOZZ", "MUCH", "MUCK", "MUDD", "MUDS", "MUFF", "MUGA", "MUGG", "MUGS", "MUID", "MUIL", "MUIR", "MULE", "MULK", "MULL", "MULT", "MUMM", "MUMP", "MUMS", "MUMU", "MUND", "MUNG", "MUNI", "MUNJ", "MUNS", "MUNT", "MUON", "MURA", "MURE", "MURK", "MURL", "MURR", "MUSA", "MUSE", "MUSH", "MUSK", "MUSO", "MUSS", "MUST", "MUTA", "MUTE", "MUTH", "MUTI", "MUTS", "MUTT", "MUZO", "MUZZ", "MYAL", "MYCS", "MYNA", "MYRA", "MYST", "MYTH", "MYXA", "MYXO", "MZEE", "NAAM", "NAAN", "NABE", "NABK", "NABS", "NABU", "NACE", "NACH", "NADA", "NADS", "NAEL", "NAFF", "NAGA", "NAGS", "NAID", "NAIF", "NAIG", "NAIK", "NAIL", "NAIM", "NAIN", "NAIO", "NAIR", "NAIS", "NAJA", "NAKE", "NAKO", "NALA", "NAMA", "NAME", "NAMS", "NAMU", "NANA", "NANE", "NANS", "NANT", "NAOI", "NAOS", "NAPA", "NAPE", "NAPS", "NAPU", "NARC", "NARD", "NARE", "NARK", "NARR", "NARY", "NASH", "NASI", "NAST", "NATE", "NATR", "NATS", "NATT", "NAUT", "NAVE", "NAVY", "NAWT", "NAYS", "NAZE", "NAZI", "NEAL", "NEAP", "NEAR", "NEAT", "NEBS", "NECK", "NEDS", "NEED", "NEEM", "NEEP", "NEER", "NEET", "NEFS", "NEGS", "NEIF", "NEIL", "NEJD", "NEKS", "NELL", "NEMA", "NEMN", "NENE", "NEON", "NEPA", "NEPS", "NERD", "NERI", "NERK", "NESE", "NESH", "NESS", "NEST", "NETE", "NETH", "NETI", "NETS", "NETT", "NEUK", "NEUM", "NEVE", "NEVI", "NEVO", "NEWS", "NEWT", "NEXT", "NGAI", "NHAN", "NIAS", "NIBS", "NICE", "NICI", "NICK", "NIDE", "NIDI", "NIDS", "NIED", "NIEF", "NIES", "NIFE", "NIFF", "NIGH", "NILE", "NILL", "NILS", "NIMB", "NIMS", "NINA", "NINE", "NING", "NIOG", "NIPA", "NIPS", "NIRL", "NISH", "NISI", "NITE", "NITO", "NITS", "NIUE", "NIXE", "NIXY", "NIZY", "NOAH", "NOAM", "NOBS", "NOCK", "NODE", "NODI", "NODS", "NOEL", "NOES", "NOGG", "NOGS", "NOIL", "NOIR", "NOLE", "NOLL", "NOLO", "NOMA", "NOME", "NOMS", "NONA", "NONE", "NONG", "NONI", "NOOK", "NOON", "NOOP", "NOPE", "NORA", "NORI", "NORK", "NORM", "NORN", "NOSE", "NOSH", "NOSU", "NOSY", "NOTA", "NOTE", "NOTT", "NOUL", "NOUN", "NOUP", "NOUS", "NOUT", "NOVA", "NOVO", "NOWL", "NOWN", "NOWS", "NOWT", "NOWY", "NOXA", "NOYS", "NOZI", "NUBA", "NUBS", "NUDA", "NUDD", "NUDE", "NUFF", "NUKE", "NULL", "NUMA", "NUMB", "NUNS", "NUPE", "NURD", "NURL", "NURR", "NURS", "NUTS", "NYAS", "NYED", "NYES", "OAFS", "OAKS", "OAKY", "OARS", "OARY", "OAST", "OATH", "OATS", "OATY", "OBAN", "OBAS", "OBES", "OBEX", "OBEY", "OBIA", "OBIS", "OBIT", "OBOE", "OBOL", "OBOS", "OCAS", "OCCY", "OCHE", "OCHT", "OCTA", "ODAH", "ODAL", "ODAS", "ODAX", "ODDS", "ODEA", "ODEL", "ODES", "ODIC", "ODIN", "ODOR", "ODSO", "ODUM", "ODYL", "OFAY", "OFER", "OFFS", "OGAM", "OGEE", "OGLE", "OGOR", "OGPU", "OGRE", "OGUM", "OHED", "OHIA", "OHIO", "OHMS", "OHOS", "OHOY", "OIKS", "OILS", "OILY", "OIME", "OINK", "OINT", "OKAS", "OKAY", "OKEE", "OKEH", "OKES", "OKET", "OKIA", "OKIE", "OKRA", "OKTA", "OLAF", "OLAM", "OLAX", "OLDS", "OLDY", "OLEA", "OLEG", "OLEO", "OLES", "OLGA", "OLID", "OLIO", "OLLA", "OLMS", "OLOF", "OLOR", "OLPE", "OMAN", "OMAO", "OMAR", "OMBU", "OMEN", "OMER", "OMIT", "OMOV", "ONAN", "ONCA", "ONCE", "ONDY", "ONER", "ONES", "ONIE", "ONLY", "ONOS", "ONST", "ONTO", "ONUS", "ONYM", "ONYX", "ONZA", "OOFS", "OOFY", "OOHS", "OOID", "OOMS", "OONS", "OONT", "OOPS", "OORD", "OOSE", "OOSY", "OOTS", "OOZE", "OOZY", "OPAH", "OPAL", "OPED", "OPEN", "OPES", "OPPO", "OPSY", "OPTS", "OPUS", "ORAD", "ORAL", "ORBS", "ORBY", "ORCA", "ORCS", "ORDO", "ORDS", "ORDU", "ORES", "ORFE", "ORFS", "ORGY", "ORLE", "ORLO", "ORNA", "ORRA", "ORTS", "ORYX", "ORZO", "OSAR", "OSES", "OSSA", "OSSE", "OTIC", "OTIS", "OTTO", "OTUS", "OUCH", "OUDS", "OUGH", "OUKS", "OULD", "OULK", "OUMA", "OUPA", "OUPH", "OUPS", "OURN", "OURS", "OUST", "OUTS", "OUZO", "OVAL", "OVEL", "OVEN", "OVER", "OVEY", "OVIS", "OVUM", "OWED", "OWEN", "OWER", "OWES", "OWLS", "OWLY", "OWNS", "OWRE", "OWSE", "OWTS", "OXAN", "OXEA", "OXEN", "OXER", "OXES", "OXID", "OXIM", "OXYL", "OYER", "OYES", "OYEZ", "OZAN", "PAAL", "PAAR", "PABA", "PACA", "PACE", "PACK", "PACO", "PACS", "PACT", "PACY", "PADI", "PADS", "PAGA", "PAGE", "PAHA", "PAHI", "PAHO", "PAHS", "PAID", "PAIK", "PAIL", "PAIN", "PAIP", "PAIR", "PAIS", "PALA", "PALE", "PALI", "PALL", "PALM", "PALP", "PALS", "PALT", "PALY", "PAMS", "PAND", "PANE", "PANG", "PANI", "PANK", "PANS", "PANT", "PAON", "PAPA", "PAPE", "PAPS", "PARA", "PARD", "PARE", "PARI", "PARK", "PARP", "PARR", "PARS", "PART", "PASE", "PASH", "PASI", "PASS", "PAST", "PATA", "PATE", "PATH", "PATO", "PATS", "PATU", "PATY", "PAUA", "PAUL", "PAUP", "PAUT", "PAVE", "PAVO", "PAVS", "PAVY", "PAWA", "PAWK", "PAWL", "PAWN", "PAWS", "PAYS", "PEAG", "PEAI", "PEAK", "PEAL", "PEAN", "PEAR", "PEAS", "PEAT", "PEBA", "PECH", "PECK", "PECS", "PEDA", "PEDS", "PEED", "PEEK", "PEEL", "PEEN", "PEEP", "PEER", "PEES", "PEGA", "PEGH", "PEGS", "PEHO", "PEHS", "PEIN", "PEKE", "PELA", "PELE", "PELF", "PELL", "PELT", "PELU", "PEND", "PENE", "PENI", "PENK", "PENS", "PENT", "PEON", "PEPO", "PEPS", "PERE", "PERI", "PERK", "PERM", "PERN", "PERP", "PERT", "PERU", "PERV", "PESA", "PESO", "PESS", "PEST", "PETE", "PETO", "PETR", "PETS", "PEUL", "PEWS", "PEWY", "PFFT", "PFUI", "PHAT", "PHEW", "PHIL", "PHIS", "PHIT", "PHIZ", "PHOH", "PHON", "PHOO", "PHOS", "PHOT", "PHUT", "PIAL", "PIAN", "PIAS", "PICA", "PICE", "PICI", "PICK", "PICO", "PICS", "PICT", "PIED", "PIEN", "PIER", "PIES", "PIET", "PIFF", "PIGS", "PIKA", "PIKE", "PIKI", "PIKY", "PILA", "PILE", "PILI", "PILL", "PILM", "PILY", "PIMA", "PIMP", "PINA", "PIND", "PINE", "PING", "PINK", "PINO", "PINS", "PINT", "PINY", "PION", "PIOY", "PIPA", "PIPE", "PIPI", "PIPS", "PIPY", "PIRL", "PIRN", "PIRO", "PIRR", "PIRS", "PISE", "PISH", "PISK", "PISO", "PISS", "PIST", "PITA", "PITH", "PITS", "PITY", "PIUM", "PIXY", "PIZE", "PLAK", "PLAN", "PLAP", "PLAT", "PLAY", "PLEA", "PLEB", "PLED", "PLEW", "PLEX", "PLIE", "PLIM", "PLOD", "PLOP", "PLOT", "PLOW", "PLOY", "PLUD", "PLUE", "PLUG", "PLUM", "PLUP", "PLUS", "POAS", "POBS", "POCK", "POCO", "PODS", "POEM", "POEP", "POET", "POGO", "POGY", "POHA", "POIL", "POIS", "POKE", "POKY", "POLE", "POLK", "POLL", "POLO", "POLS", "POLT", "POLY", "POME", "POMO", "POMP", "POMS", "POND", "PONE", "PONG", "PONK", "PONS", "PONT", "PONY", "POOA", "POOD", "POOF", "POOH", "POOK", "POOL", "POON", "POOP", "POOR", "POOS", "POOT", "POPE", "POPS", "PORE", "PORK", "PORN", "PORR", "PORT", "PORY", "POSE", "POSH", "POSS", "POST", "POSY", "POTE", "POTS", "POTT", "POUF", "POUK", "POUR", "POUT", "POWN", "POWS", "POXY", "POZZ", "PRAD", "PRAM", "PRAO", "PRAT", "PRAU", "PRAY", "PREE", "PREM", "PREP", "PREX", "PREY", "PREZ", "PRIA", "PRIG", "PRIM", "PROA", "PROB", "PROD", "PROF", "PROG", "PROM", "PROO", "PROP", "PROS", "PROW", "PRUE", "PRUH", "PRUT", "PRYS", "PSHA", "PSIS", "PSST", "PTUI", "PUAN", "PUBE", "PUBS", "PUCE", "PUCK", "PUDS", "PUDU", "PUER", "PUFF", "PUGH", "PUGS", "PUHA", "PUIR", "PUJA", "PUKA", "PUKE", "PUKU", "PUKY", "PULA", "PULE", "PULI", "PULK", "PULL", "PULP", "PULS", "PULU", "PULY", "PUMA", "PUME", "PUMP", "PUMY", "PUNA", "PUNG", "PUNK", "PUNO", "PUNS", "PUNT", "PUNY", "PUPA", "PUPS", "PUPU", "PURE", "PURI", "PURL", "PURR", "PURS", "PURU", "PUSH", "PUSS", "PUTS", "PUTT", "PUTZ", "PUXY", "PUYA", "PUYS", "PYAL", "PYAS", "PYAT", "PYES", "PYET", "PYIC", "PYIN", "PYKE", "PYLA", "PYNE", "PYOT", "PYRE", "PYRO", "QADI", "QAID", "QATS", "QERE", "QERI", "QOPH", "QUAB", "QUAD", "QUAG", "QUAI", "QUAN", "QUAR", "QUAT", "QUAW", "QUAY", "QUEI", "QUEP", "QUET", "QUEY", "QUIB", "QUID", "QUIM", "QUIN", "QUIP", "QUIS", "QUIT", "QUIZ", "QUNG", "QUOD", "QUOP", "QUOT", "RAAD", "RABI", "RACA", "RACE", "RACH", "RACK", "RACY", "RADA", "RADE", "RADS", "RAFE", "RAFF", "RAFT", "RAGA", "RAGE", "RAGG", "RAGI", "RAGS", "RAHS", "RAIA", "RAID", "RAIF", "RAIK", "RAIL", "RAIN", "RAIS", "RAIT", "RAJA", "RAKE", "RAKH", "RAKI", "RAKU", "RALE", "RALF", "RAMA", "RAME", "RAMI", "RAMP", "RAMS", "RANA", "RAND", "RANE", "RANG", "RANI", "RANK", "RANN", "RANT", "RAPE", "RAPS", "RAPT", "RARE", "RARK", "RASA", "RASE", "RASH", "RASP", "RAST", "RATA", "RATE", "RATH", "RATO", "RATS", "RATU", "RAUK", "RAUL", "RAUN", "RAVE", "RAVI", "RAWN", "RAWS", "RAYA", "RAYS", "RAZE", "RAZZ", "READ", "REAK", "REAL", "REAM", "REAN", "REAP", "REAR", "REBS", "RECK", "RECS", "RECT", "REDD", "REDE", "REDO", "REDS", "REED", "REEF", "REEK", "REEL", "REEM", "REEN", "REES", "REET", "REFS", "REFT", "REGO", "REGS", "REHS", "REID", "REIF", "REIK", "REIM", "REIN", "REIS", "REIT", "REKE", "REKI", "RELY", "REMI", "REMS", "REND", "RENK", "RENS", "RENT", "RENU", "RENY", "REOS", "REPO", "REPP", "REPS", "RESH", "RESP", "REST", "RETE", "RETS", "REUB", "REVE", "REVS", "REWS", "RHEA", "RHOS", "RHUS", "RIAL", "RIAS", "RIBA", "RIBE", "RIBS", "RICE", "RICH", "RICK", "RICY", "RIDE", "RIDS", "RIEL", "RIEM", "RIER", "RIFE", "RIFF", "RIFI", "RIFS", "RIFT", "RIGG", "RIGS", "RIKK", "RILE", "RILL", "RIMA", "RIME", "RIMS", "RIMU", "RIMY", "RIND", "RINE", "RING", "RINK", "RINS", "RIOT", "RIPA", "RIPE", "RIPP", "RIPS", "RIPT", "RISE", "RISK", "RISP", "RISS", "RIST", "RITA", "RITE", "RITS", "RITT", "RITZ", "RIVA", "RIVE", "RIVO", "RIXY", "RIZA", "ROAD", "ROAM", "ROAN", "ROAR", "ROBE", "ROBS", "ROCH", "ROCK", "ROCS", "RODD", "RODE", "RODS", "ROED", "ROER", "ROES", "ROEY", "ROID", "ROIL", "ROIN", "ROIT", "ROJI", "ROKA", "ROKE", "ROKS", "ROKY", "ROLE", "ROLF", "ROLL", "ROMA", "ROME", "ROMP", "ROMS", "ROND", "RONE", "RONG", "RONT", "ROOD", "ROOF", "ROOK", "ROOL", "ROOM", "ROON", "ROOP", "ROOS", "ROOT", "ROPE", "ROPP", "ROPY", "RORE", "RORI", "RORT", "RORY", "ROSA", "ROSE", "ROSS", "ROST", "ROSY", "ROTA", "ROTE", "ROTI", "ROTL", "ROTO", "ROTS", "ROUB", "ROUD", "ROUE", "ROUL", "ROUM", "ROUN", "ROUP", "ROUT", "ROUX", "ROVE", "ROWS", "ROWT", "ROWY", "ROXY", "ROYT", "RUBE", "RUBS", "RUBY", "RUCK", "RUCS", "RUDD", "RUDE", "RUDS", "RUDY", "RUED", "RUEN", "RUER", "RUES", "RUFF", "RUGA", "RUGS", "RUIN", "RUKH", "RULE", "RULL", "RULY", "RUME", "RUMP", "RUMS", "RUND", "RUNE", "RUNG", "RUNS", "RUNT", "RUPA", "RURP", "RURU", "RUSA", "RUSE", "RUSH", "RUSK", "RUSS", "RUST", "RUTA", "RUTH", "RUTS", "RYAL", "RYAS", "RYEN", "RYES", "RYFE", "RYKE", "RYME", "RYND", "RYNT", "RYOT", "RYPE", "SAAD", "SAAN", "SABA", "SABE", "SABS", "SACK", "SACO", "SACS", "SADE", "SADH", "SADI", "SADO", "SADR", "SADS", "SAFE", "SAFI", "SAFT", "SAGA", "SAGE", "SAGO", "SAGS", "SAGY", "SAHH", "SAHO", "SAIC", "SAID", "SAIL", "SAIM", "SAIN", "SAIP", "SAIR", "SAIS", "SAKA", "SAKE", "SAKI", "SALE", "SALL", "SALM", "SALP", "SALS", "SALT", "SAMA", "SAME", "SAMH", "SAMP", "SAMS", "SAND", "SANE", "SANG", "SANK", "SANS", "SANT", "SAPA", "SAPO", "SAPS", "SARA", "SARD", "SARE", "SARI", "SARK", "SARS", "SART", "SASA", "SASH", "SASS", "SATE", "SATI", "SAUF", "SAUL", "SAUM", "SAUR", "SAUT", "SAVE", "SAVS", "SAWN", "SAWS", "SAWT", "SAXE", "SAYA", "SAYS", "SCAB", "SCAD", "SCAG", "SCAM", "SCAN", "SCAP", "SCAR", "SCAT", "SCAW", "SCHO", "SCOB", "SCOG", "SCOP", "SCOT", "SCOW", "SCRY", "SCUD", "SCUG", "SCUL", "SCUM", "SCUN", "SCUP", "SCUR", "SCUT", "SCYE", "SCYT", "SEAH", "SEAK", "SEAL", "SEAM", "SEAN", "SEAR", "SEAS", "SEAT", "SEAX", "SEBA", "SECH", "SECK", "SECO", "SECS", "SECT", "SEED", "SEEK", "SEEL", "SEEM", "SEEN", "SEEP", "SEER", "SEES", "SEGO", "SEGS", "SEID", "SEIF", "SEIK", "SEIL", "SEIR", "SEIS", "SEIT", "SEKT", "SELD", "SELE", "SELF", "SELL", "SELS", "SELT", "SEME", "SEMI", "SENA", "SEND", "SENE", "SENS", "SENT", "SEPS", "SEPT", "SERA", "SERB", "SERE", "SERF", "SERI", "SERK", "SERO", "SERR", "SERS", "SERT", "SESE", "SESH", "SESS", "SETA", "SETH", "SETS", "SETT", "SEWN", "SEWS", "SEXT", "SEXY", "SEYS", "SGAD", "SHAB", "SHAD", "SHAG", "SHAH", "SHAI", "SHAM", "SHAN", "SHAP", "SHAT", "SHAW", "SHAY", "SHEA", "SHED", "SHEE", "SHEL", "SHEN", "SHER", "SHES", "SHET", "SHEW", "SHIH", "SHIK", "SHIM", "SHIN", "SHIP", "SHIR", "SHIT", "SHIV", "SHLU", "SHMO", "SHOA", "SHOD", "SHOE", "SHOG", "SHOO", "SHOP", "SHOQ", "SHOR", "SHOT", "SHOU", "SHOW", "SHRI", "SHUG", "SHUL", "SHUN", "SHUT", "SHWA", "SIAK", "SIAL", "SIAM", "SIBB", "SIBS", "SICE", "SICH", "SICK", "SICS", "SIDA", "SIDE", "SIDH", "SIDI", "SIDY", "SIEN", "SIER", "SIES", "SIFE", "SIFT", "SIGH", "SIGN", "SIJO", "SIKA", "SIKE", "SIKH", "SILD", "SILE", "SILK", "SILL", "SILO", "SILT", "SIMA", "SIME", "SIMI", "SIMP", "SIMS", "SINA", "SIND", "SINE", "SING", "SINH", "SINK", "SINS", "SIOL", "SION", "SIPE", "SIPS", "SIRE", "SIRI", "SIRS", "SISE", "SISH", "SISI", "SISS", "SIST", "SITA", "SITE", "SITH", "SITS", "SITZ", "SIUM", "SIVA", "SIZE", "SIZY", "SIZZ", "SJOE", "SKAG", "SKAL", "SKAS", "SKAT", "SKAW", "SKEE", "SKEF", "SKEG", "SKEL", "SKEN", "SKEO", "SKEP", "SKER", "SKET", "SKEW", "SKEY", "SKID", "SKIL", "SKIM", "SKIN", "SKIO", "SKIP", "SKIS", "SKIT", "SKIV", "SKOL", "SKOO", "SKRY", "SKUA", "SKUG", "SKUN", "SKYE", "SKYF", "SKYR", "SLAB", "SLAD", "SLAE", "SLAG", "SLAM", "SLAP", "SLAT", "SLAV", "SLAW", "SLAY", "SLEB", "SLED", "SLEE", "SLEW", "SLEY", "SLID", "SLIM", "SLIP", "SLIT", "SLOB", "SLOD", "SLOE", "SLOG", "SLON", "SLOO", "SLOP", "SLOT", "SLOW", "SLUB", "SLUD", "SLUE", "SLUG", "SLUM", "SLUR", "SLUT", "SMEE", "SMEW", "SMIR", "SMIT", "SMOG", "SMUG", "SMUR", "SMUT", "SNAB", "SNAG", "SNAP", "SNAR", "SNAW", "SNEB", "SNED", "SNEE", "SNEW", "SNIB", "SNIG", "SNIP", "SNIT", "SNOB", "SNOD", "SNOG", "SNOP", "SNOT", "SNOW", "SNUB", "SNUG", "SNUM", "SNUP", "SNUR", "SNYE", "SOAK", "SOAM", "SOAP", "SOAR", "SOBA", "SOBS", "SOCA", "SOCE", "SOCK", "SOCO", "SOCS", "SODA", "SODS", "SODY", "SOFA", "SOFT", "SOGA", "SOGS", "SOHO", "SOHS", "SOIL", "SOJA", "SOKA", "SOKE", "SOLA", "SOLD", "SOLE", "SOLI", "SOLO", "SOLS", "SOMA", "SOME", "SOMS", "SOMY", "SOND", "SONE", "SONG", "SONK", "SONS", "SOOK", "SOOL", "SOOM", "SOON", "SOOP", "SOOT", "SOPE", "SOPH", "SOPS", "SORA", "SORB", "SORD", "SORE", "SORI", "SORN", "SORT", "SORY", "SOSH", "SOSO", "SOSS", "SOTH", "SOTS", "SOUD", "SOUK", "SOUL", "SOUM", "SOUP", "SOUR", "SOUS", "SOUT", "SOVS", "SOWF", "SOWL", "SOWM", "SOWN", "SOWP", "SOWS", "SOWT", "SOYA", "SOYS", "SPAD", "SPAE", "SPAG", "SPAK", "SPAM", "SPAN", "SPAR", "SPAS", "SPAT", "SPAW", "SPAY", "SPAZ", "SPEC", "SPED", "SPEK", "SPET", "SPEW", "SPEX", "SPIC", "SPIE", "SPIF", "SPIG", "SPIK", "SPIM", "SPIN", "SPIT", "SPIV", "SPOD", "SPOR", "SPOT", "SPRY", "SPUD", "SPUE", "SPUG", "SPUN", "SPUR", "SPUT", "SRIS", "STAB", "STAG", "STAM", "STAN", "STAP", "STAR", "STAT", "STAW", "STAY", "STED", "STEG", "STEM", "STEN", "STEP", "STET", "STEW", "STEY", "STIB", "STID", "STIE", "STIM", "STIR", "STOA", "STOB", "STOD", "STOF", "STOG", "STOP", "STOT", "STOW", "STRA", "STRE", "STUB", "STUD", "STUE", "STUG", "STUM", "STUN", "STUT", "STYE", "STYX", "SUBA", "SUBS", "SUCH", "SUCK", "SUDD", "SUDS", "SUED", "SUER", "SUES", "SUET", "SUFF", "SUFI", "SUGH", "SUGI", "SUID", "SUIT", "SUJI", "SUKH", "SUKS", "SUKU", "SULA", "SULD", "SULK", "SULL", "SULU", "SUMO", "SUMP", "SUMS", "SUMY", "SUNE", "SUNG", "SUNK", "SUNN", "SUNS", "SUNT", "SUPA", "SUPE", "SUPS", "SUQS", "SURA", "SURD", "SURE", "SURF", "SUSI", "SUSS", "SUSU", "SUTO", "SUTU", "SUUM", "SUWE", "SUZY", "SVAN", "SWAB", "SWAD", "SWAG", "SWAM", "SWAN", "SWAP", "SWAT", "SWAY", "SWEE", "SWEP", "SWEY", "SWIG", "SWIM", "SWIZ", "SWOB", "SWOM", "SWOP", "SWOT", "SWOW", "SWUM", "SYBO", "SYCE", "SYED", "SYEN", "SYES", "SYKE", "SYLI", "SYNC", "SYND", "SYNE", "SYPE", "SYPH", "SYRE", "SYRT", "SYUN", "TAAL", "TAAR", "TABI", "TABS", "TABU", "TACE", "TACH", "TACK", "TACO", "TACT", "TADE", "TADS", "TAED", "TAEL", "TAEN", "TAES", "TAFT", "TAGS", "TAHA", "TAHR", "TAIG", "TAIL", "TAIN", "TAIS", "TAIT", "TAKA", "TAKE", "TAKI", "TAKS", "TAKT", "TAKU", "TAKY", "TALA", "TALC", "TALD", "TALE", "TALI", "TALK", "TALL", "TAMA", "TAME", "TAMP", "TAMS", "TANA", "TANE", "TANG", "TANH", "TANK", "TANO", "TANS", "TAOS", "TAPA", "TAPE", "TAPS", "TAPU", "TARA", "TARE", "TARI", "TARN", "TARO", "TARP", "TARR", "TARS", "TART", "TASH", "TASK", "TASS", "TASU", "TATE", "TATH", "TATS", "TATT", "TATU", "TAUM", "TAUN", "TAUR", "TAUS", "TAUT", "TAVA", "TAVE", "TAVS", "TAVY", "TAWA", "TAWN", "TAWS", "TAWT", "TAXA", "TAXI", "TAXY", "TAYS", "TCHE", "TCHI", "TCHU", "TEAD", "TEAK", "TEAL", "TEAM", "TEAN", "TEAP", "TEAR", "TEAS", "TEAT", "TEBU", "TECA", "TECH", "TECK", "TECO", "TECS", "TEDA", "TEDS", "TEDY", "TEED", "TEEK", "TEEL", "TEEM", "TEEN", "TEER", "TEES", "TEET", "TEFF", "TEFS", "TEGG", "TEGS", "TEGU", "TEHR", "TEIL", "TEJU", "TELA", "TELD", "TELE", "TELI", "TELL", "TELS", "TELT", "TEMA", "TEME", "TEMP", "TEMS", "TEND", "TENE", "TENG", "TENS", "TENT", "TEPA", "TERA", "TERF", "TERI", "TERM", "TERN", "TERP", "TESS", "TEST", "TETE", "TETH", "TETS", "TEUK", "TEWA", "TEWS", "TEXT", "THAD", "THAE", "THAI", "THAN", "THAR", "THAT", "THAW", "THEA", "THEB", "THEE", "THEM", "THEN", "THEO", "THEW", "THEY", "THIG", "THIN", "THIO", "THIR", "THIS", "THOB", "THOF", "THON", "THOO", "THOS", "THOU", "THOW", "THRO", "THRU", "THUD", "THUG", "THUS", "TIAM", "TIAO", "TIAR", "TICE", "TICH", "TICK", "TICS", "TIDE", "TIDS", "TIDY", "TIED", "TIEN", "TIER", "TIES", "TIFF", "TIFT", "TIGE", "TIGS", "TIKA", "TIKE", "TIKI", "TILE", "TILL", "TILS", "TILT", "TIME", "TIMO", "TINA", "TIND", "TINE", "TING", "TINK", "TINO", "TINS", "TINT", "TINY", "TIOU", "TIPE", "TIPI", "TIPS", "TIPT", "TIRE", "TIRL", "TIRO", "TIRR", "TITE", "TITI", "TITS", "TIVY", "TIZA", "TIZZ", "TOAD", "TOAG", "TOAT", "TOBA", "TOBE", "TOBY", "TOCK", "TOCO", "TOCS", "TODA", "TODD", "TODE", "TODS", "TODY", "TOEA", "TOED", "TOES", "TOEY", "TOFF", "TOFT", "TOFU", "TOGA", "TOGE", "TOGS", "TOGT", "TOHO", "TOIL", "TOIT", "TOKE", "TOKO", "TOLA", "TOLD", "TOLE", "TOLL", "TOLT", "TOLU", "TOMA", "TOMB", "TOME", "TOMO", "TOMS", "TONE", "TONG", "TONK", "TONS", "TONY", "TOOK", "TOOL", "TOOM", "TOON", "TOOP", "TOOT", "TOPE", "TOPH", "TOPI", "TOPO", "TOPS", "TORA", "TORC", "TORE", "TORI", "TORN", "TORO", "TORR", "TORS", "TORT", "TORU", "TORY", "TOSA", "TOSE", "TOSH", "TOSK", "TOSS", "TOST", "TOSY", "TOTE", "TOTO", "TOTS", "TOTY", "TOUG", "TOUK", "TOUN", "TOUP", "TOUR", "TOUT", "TOWD", "TOWN", "TOWS", "TOWT", "TOWY", "TOXA", "TOYO", "TOYS", "TOZE", "TRAD", "TRAG", "TRAH", "TRAM", "TRAN", "TRAP", "TRAT", "TRAY", "TREE", "TREF", "TREK", "TRES", "TRET", "TREW", "TREY", "TREZ", "TRIE", "TRIG", "TRIM", "TRIN", "TRIO", "TRIP", "TRIX", "TROD", "TROG", "TRON", "TROP", "TROT", "TROW", "TROY", "TRUB", "TRUE", "TRUG", "TRUN", "TRYE", "TRYP", "TRYT", "TSAR", "TSHI", "TSIA", "TSKS", "TSUN", "TUAN", "TUBA", "TUBE", "TUBS", "TUCK", "TUFA", "TUFF", "TUFT", "TUGS", "TUIK", "TUIS", "TUKE", "TULA", "TULE", "TULU", "TUME", "TUMP", "TUMS", "TUNA", "TUND", "TUNE", "TUNG", "TUNK", "TUNO", "TUNS", "TUNU", "TUNY", "TUPI", "TUPS", "TURB", "TURD", "TURF", "TURI", "TURK", "TURM", "TURN", "TURP", "TURR", "TUSH", "TUSK", "TUTE", "TUTH", "TUTS", "TUTU", "TUWI", "TUZA", "TUZZ", "TWAE", "TWAL", "TWAS", "TWAT", "TWAY", "TWEE", "TWIG", "TWIN", "TWIT", "TWOS", "TYDE", "TYED", "TYEE", "TYER", "TYES", "TYGS", "TYIN", "TYKE", "TYMP", "TYND", "TYNE", "TYPE", "TYPO", "TYPP", "TYPY", "TYRE", "TYRO", "TYRR", "TYTE", "TYTO", "TZAR", "UANG", "UBII", "UCAL", "UDAL", "UDIC", "UDON", "UDOS", "UEYS", "UFOS", "UGHS", "UGLY", "UILY", "UKES", "ULAN", "ULES", "ULEX", "ULLA", "ULMO", "ULNA", "ULUA", "ULUS", "ULVA", "UMBO", "UMPH", "UMPS", "UMPY", "UNAI", "UNAL", "UNAU", "UNBE", "UNCA", "UNCE", "UNCI", "UNCO", "UNDE", "UNDO", "UNDY", "UNIE", "UNIO", "UNIS", "UNIT", "UNTO", "UNTZ", "UNZE", "UPAS", "UPBY", "UPDO", "UPGO", "UPLA", "UPON", "UPSY", "UPTA", "URAL", "URAN", "URAO", "URBS", "URDE", "URDS", "URDU", "URDY", "UREA", "URES", "URGE", "URIA", "URIC", "URNA", "URNS", "URPS", "URSA", "URUS", "URVA", "USAR", "USED", "USEE", "USER", "USES", "USUN", "UTAH", "UTAI", "UTAS", "UTCH", "UTES", "UTIS", "UTUM", "UTUS", "UVAE", "UVAL", "UVAS", "UVEA", "UVIC", "UVID", "UZAN", "VACS", "VADE", "VADY", "VAES", "VAGE", "VAGI", "VAGS", "VAIL", "VAIN", "VAIR", "VALE", "VALI", "VALL", "VAMP", "VANE", "VANG", "VANS", "VANT", "VARA", "VARE", "VARI", "VARS", "VARY", "VASA", "VASE", "VAST", "VASU", "VATS", "VATU", "VAUS", "VAUT", "VAVS", "VAWS", "VAYU", "VEAL", "VEDA", "VEEN", "VEEP", "VEER", "VEES", "VEGA", "VEGO", "VEHM", "VEIL", "VEIN", "VELA", "VELD", "VELE", "VELL", "VELO", "VENA", "VEND", "VENT", "VEPS", "VERA", "VERB", "VERD", "VERI", "VERN", "VERS", "VERT", "VERY", "VEST", "VETA", "VETO", "VETS", "VEXT", "VIAE", "VIAL", "VIAS", "VIBE", "VIBS", "VICE", "VICK", "VIDE", "VIDS", "VIED", "VIER", "VIES", "VIEW", "VIGA", "VIGS", "VILA", "VILD", "VILE", "VILI", "VILL", "VIMS", "VINA", "VINE", "VINO", "VINS", "VINT", "VINY", "VIOL", "VIRA", "VIRE", "VIRL", "VISA", "VISE", "VITA", "VITE", "VITI", "VIVA", "VIVE", "VIVO", "VIZY", "VLEI", "VOAR", "VOES", "VOET", "VOID", "VOLA", "VOLE", "VOLK", "VOLS", "VOLT", "VORS", "VOTA", "VOTE", "VOWS", "VRIL", "VROT", "VROU", "VROW", "VUGG", "VUGH", "VUGS", "VULN", "VUMS", "WAAC", "WAAG", "WAAR", "WABE", "WABI", "WABS", "WACE", "WACK", "WACO", "WADD", "WADE", "WADI", "WADS", "WADT", "WADY", "WAEG", "WAER", "WAES", "WAFD", "WAFF", "WAFT", "WAGE", "WAGS", "WAID", "WAIF", "WAIK", "WAIL", "WAIN", "WAIR", "WAIS", "WAIT", "WAKA", "WAKE", "WAKF", "WAKY", "WALD", "WALE", "WALI", "WALK", "WALL", "WALT", "WALY", "WAME", "WAMP", "WAND", "WANE", "WANG", "WANK", "WANS", "WANT", "WANY", "WAPP", "WAPS", "WAQF", "WARB", "WARD", "WARE", "WARF", "WARK", "WARL", "WARM", "WARN", "WARP", "WARS", "WART", "WARY", "WASE", "WASH", "WASM", "WASP", "WAST", "WATE", "WATH", "WATS", "WATT", "WAUF", "WAUK", "WAUL", "WAUP", "WAUR", "WAVE", "WAVY", "WAWA", "WAWE", "WAWL", "WAWS", "WAXY", "WAYS", "WEAK", "WEAL", "WEAM", "WEAN", "WEAR", "WEBS", "WEDE", "WEDS", "WEED", "WEEK", "WEEL", "WEEM", "WEEN", "WEEP", "WEER", "WEES", "WEET", "WEFT", "WEGA", "WEID", "WEIL", "WEIR", "WEKA", "WEKI", "WELD", "WELF", "WELK", "WELL", "WELS", "WELT", "WEMB", "WEMS", "WENA", "WEND", "WENE", "WENS", "WENT", "WEPT", "WERE", "WERF", "WERI", "WERO", "WERT", "WESE", "WEST", "WETA", "WETS", "WEVE", "WEXE", "WEYS", "WEZN", "WHAE", "WHAM", "WHAN", "WHAP", "WHAR", "WHAT", "WHAU", "WHEE", "WHEN", "WHET", "WHEW", "WHEY", "WHID", "WHIG", "WHIM", "WHIN", "WHIO", "WHIP", "WHIR", "WHIT", "WHIZ", "WHOA", "WHOM", "WHOO", "WHOP", "WHOT", "WHOW", "WHUD", "WHUN", "WHUP", "WHUZ", "WHYO", "WHYS", "WICE", "WICH", "WICK", "WIDE", "WIDU", "WIEL", "WIFE", "WIGS", "WILD", "WILE", "WILI", "WILK", "WILL", "WILT", "WILY", "WIME", "WIMP", "WIND", "WINE", "WING", "WINK", "WINN", "WINO", "WINS", "WINT", "WINY", "WIPE", "WIPS", "WIRD", "WIRE", "WIRL", "WIRR", "WIRY", "WISE", "WISH", "WISP", "WISS", "WIST", "WITE", "WITH", "WITS", "WIVE", "WOAD", "WOAK", "WOAN", "WOCK", "WODE", "WOES", "WOFS", "WOFT", "WOGS", "WOKE", "WOKS", "WOLD", "WOLF", "WOMB", "WONE", "WONG", "WONK", "WONS", "WONT", "WOOD", "WOOF", "WOOL", "WOOM", "WOON", "WOOS", "WOOT", "WOPS", "WORD", "WORE", "WORK", "WORM", "WORN", "WORT", "WOST", "WOTE", "WOTS", "WOUF", "WOVE", "WOWF", "WOWS", "WOWT", "WRAF", "WRAN", "WRAP", "WRAW", "WREN", "WRIG", "WRIT", "WROX", "WUDS", "WUDU", "WUGG", "WULK", "WULL", "WUSH", "WUSP", "WUSS", "WUST", "WUZU", "WYCH", "WYDE", "WYES", "WYKE", "WYLE", "WYND", "WYNE", "WYNN", "WYNS", "WYPE", "WYSS", "WYTE", "WYVE", "XEMA", "XINA", "XIPE", "XMAS", "XOSA", "XYLA", "XYST", "YAAR", "YABA", "YABU", "YACK", "YADE", "YADS", "YAFF", "YAGI", "YAGS", "YAHS", "YAIR", "YAJE", "YAKA", "YAKS", "YALB", "YALD", "YALE", "YALI", "YAMP", "YAMS", "YANA", "YANG", "YANK", "YAPA", "YAPP", "YAPS", "YARB", "YARD", "YARE", "YARK", "YARL", "YARM", "YARN", "YARR", "YARU", "YATE", "YATI", "YAUD", "YAUP", "YAVA", "YAWL", "YAWN", "YAWP", "YAWS", "YAWY", "YAYA", "YAYS", "YBET", "YCIE", "YDAY", "YEAD", "YEAH", "YEAN", "YEAR", "YEAS", "YEAT", "YEBO", "YECH", "YEDE", "YEED", "YEEL", "YEES", "YEGG", "YELD", "YELK", "YELL", "YELM", "YELP", "YELT", "YENI", "YENS", "YEPS", "YERB", "YERD", "YERE", "YERK", "YERN", "YESE", "YESK", "YESO", "YEST", "YETA", "YETH", "YETI", "YETT", "YEUK", "YEVE", "YEWS", "YGOE", "YIDS", "YIGH", "YIKE", "YILL", "YILT", "YINS", "YIPE", "YIPS", "YIRD", "YIRK", "YIRM", "YIRN", "YIRR", "YITE", "YLEM", "YLKE", "YMPE", "YMPT", "YOBI", "YOBS", "YOCK", "YODE", "YODH", "YODS", "YOGA", "YOGH", "YOGI", "YOKE", "YOKS", "YOKY", "YOLD", "YOLK", "YOMP", "YOND", "YONI", "YONT", "YOOF", "YOOK", "YOOP", "YORE", "YORK", "YORP", "YOTE", "YOUD", "YOUK", "YOUL", "YOUP", "YOUR", "YOUS", "YOWE", "YOWL", "YOWS", "YOWT", "YUAN", "YUCA", "YUCH", "YUCK", "YUFT", "YUGA", "YUGS", "YUIT", "YUKE", "YUKI", "YUKO", "YUKS", "YUKY", "YULE", "YUMA", "YUMP", "YUNX", "YUPS", "YURT", "YUTU", "YUTZ", "YUZU", "YWIS", "ZACH", "ZACK", "ZAGS", "ZAIN", "ZANT", "ZANY", "ZAPS", "ZARF", "ZARP", "ZATI", "ZEAL", "ZEAS", "ZEBU", "ZEDS", "ZEED", "ZEES", "ZEIN", "ZEKE", "ZEKS", "ZELS", "ZEMI", "ZEND", "ZENU", "ZEPS", "ZERK", "ZERO", "ZEST", "ZETA", "ZEUS", "ZEZE", "ZHOS", "ZIFF", "ZIGS", "ZILA", "ZILL", "ZIMB", "ZINC", "ZINE", "ZING", "ZINK", "ZINS", "ZION", "ZIPA", "ZIPS", "ZIRA", "ZITE", "ZITI", "ZITS", "ZIZZ", "ZOBO", "ZOBU", "ZOEA", "ZOGO", "ZOIC", "ZOID", "ZOLL", "ZOLS", "ZONA", "ZONE", "ZONK", "ZOOM", "ZOON", "ZOOS", "ZOOT", "ZORI", "ZOUK", "ZULU", "ZUNI", "ZUPA", "ZURF", "ZUZA", "ZYGA", "ZYME", "ZZZS"];

export const WORD_LADDER_SET: Set<string> = new Set(WORD_LADDER_DICTIONARY);

/**
 * Curated list of daily holiday and winter word ladder challenges (min 3 steps, max 6 steps).
 * Every pair has been mathematically verified via Breadth-First Search (BFS).
 */
export const WORD_LADDER_PRESETS: WordLadderPuzzle[] = [
  {
    "startWord": "COLD",
    "targetWord": "WARM",
    "minSteps": 4,
    "samplePath": [
      "COLD",
      "WOLD",
      "WORD",
      "WARD",
      "WARM"
    ]
  },
  {
    "startWord": "DEER",
    "targetWord": "SLED",
    "minSteps": 3,
    "samplePath": [
      "DEER",
      "SEER",
      "SEED",
      "SLED"
    ]
  },
  {
    "startWord": "FIRE",
    "targetWord": "COLD",
    "minSteps": 4,
    "samplePath": [
      "FIRE",
      "FORE",
      "CORE",
      "COLE",
      "COLD"
    ]
  },
  {
    "startWord": "SNOW",
    "targetWord": "MELT",
    "minSteps": 5,
    "samplePath": [
      "SNOW",
      "SNOT",
      "SOOT",
      "MOOT",
      "MOLT",
      "MELT"
    ]
  },
  {
    "startWord": "COAT",
    "targetWord": "VEST",
    "minSteps": 3,
    "samplePath": [
      "COAT",
      "COST",
      "CEST",
      "VEST"
    ]
  },
  {
    "startWord": "SOUP",
    "targetWord": "BOWL",
    "minSteps": 3,
    "samplePath": [
      "SOUP",
      "SOUL",
      "SOWL",
      "BOWL"
    ]
  },
  {
    "startWord": "BELL",
    "targetWord": "RING",
    "minSteps": 5,
    "samplePath": [
      "BELL",
      "BILL",
      "RILL",
      "RILE",
      "RINE",
      "RING"
    ]
  },
  {
    "startWord": "STAR",
    "targetWord": "MOON",
    "minSteps": 5,
    "samplePath": [
      "STAR",
      "SEAR",
      "SEAN",
      "MEAN",
      "MOAN",
      "MOON"
    ]
  },
  {
    "startWord": "WOOD",
    "targetWord": "FIRE",
    "minSteps": 4,
    "samplePath": [
      "WOOD",
      "FOOD",
      "FORD",
      "FORE",
      "FIRE"
    ]
  },
  {
    "startWord": "WALK",
    "targetWord": "REST",
    "minSteps": 4,
    "samplePath": [
      "WALK",
      "WELK",
      "WELT",
      "WEST",
      "REST"
    ]
  },
  {
    "startWord": "DARK",
    "targetWord": "MOON",
    "minSteps": 4,
    "samplePath": [
      "DARK",
      "DARN",
      "DORN",
      "MORN",
      "MOON"
    ]
  },
  {
    "startWord": "BEAR",
    "targetWord": "WOLF",
    "minSteps": 5,
    "samplePath": [
      "BEAR",
      "DEAR",
      "DEAF",
      "DELF",
      "WELF",
      "WOLF"
    ]
  },
  {
    "startWord": "PINE",
    "targetWord": "TREE",
    "minSteps": 5,
    "samplePath": [
      "PINE",
      "TINE",
      "TIPE",
      "TYPE",
      "TYEE",
      "TREE"
    ]
  },
  {
    "startWord": "GOLD",
    "targetWord": "RING",
    "minSteps": 4,
    "samplePath": [
      "GOLD",
      "GOND",
      "ROND",
      "RIND",
      "RING"
    ]
  },
  {
    "startWord": "READ",
    "targetWord": "BOOK",
    "minSteps": 4,
    "samplePath": [
      "READ",
      "ROAD",
      "ROOD",
      "BOOD",
      "BOOK"
    ]
  },
  {
    "startWord": "CALM",
    "targetWord": "WIND",
    "minSteps": 5,
    "samplePath": [
      "CALM",
      "BALM",
      "BALD",
      "BAND",
      "WAND",
      "WIND"
    ]
  },
  {
    "startWord": "SHIP",
    "targetWord": "DOCK",
    "minSteps": 5,
    "samplePath": [
      "SHIP",
      "SHAP",
      "SOAP",
      "SOAK",
      "SOCK",
      "DOCK"
    ]
  },
  {
    "startWord": "PLAY",
    "targetWord": "GAME",
    "minSteps": 6,
    "samplePath": [
      "PLAY",
      "PLAP",
      "PLUP",
      "PAUP",
      "GAUP",
      "GAMP",
      "GAME"
    ]
  },
  {
    "startWord": "WISH",
    "targetWord": "STAR",
    "minSteps": 6,
    "samplePath": [
      "WISH",
      "SISH",
      "SITH",
      "SETH",
      "SEAH",
      "SEAR",
      "STAR"
    ]
  },
  {
    "startWord": "WIND",
    "targetWord": "SNOW",
    "minSteps": 6,
    "samplePath": [
      "WIND",
      "SIND",
      "SEND",
      "SEED",
      "SNED",
      "SNOD",
      "SNOW"
    ]
  },
  {
    "startWord": "PEAK",
    "targetWord": "SNOW",
    "minSteps": 6,
    "samplePath": [
      "PEAK",
      "FEAK",
      "FLAK",
      "FLAW",
      "SLAW",
      "SNAW",
      "SNOW"
    ]
  },
  {
    "startWord": "LAKE",
    "targetWord": "POND",
    "minSteps": 4,
    "samplePath": [
      "LAKE",
      "LOKE",
      "POKE",
      "PONE",
      "POND"
    ]
  },
  {
    "startWord": "LOGS",
    "targetWord": "FIRE",
    "minSteps": 4,
    "samplePath": [
      "LOGS",
      "LORS",
      "LORE",
      "FORE",
      "FIRE"
    ]
  },
  {
    "startWord": "CAMP",
    "targetWord": "TENT",
    "minSteps": 5,
    "samplePath": [
      "CAMP",
      "TAMP",
      "TEMP",
      "TEAP",
      "TEAT",
      "TENT"
    ]
  },
  {
    "startWord": "PACK",
    "targetWord": "SLED",
    "minSteps": 5,
    "samplePath": [
      "PACK",
      "SACK",
      "SECK",
      "SEEK",
      "SEED",
      "SLED"
    ]
  }
];

/**
 * Breadth-First Search (BFS) to find the shortest transformation path between two words.
 * Returns the array of words forming the shortest path, or null if unreachable.
 */
export function findShortestLadderPath(
  startWord: string,
  targetWord: string,
  dict: Set<string> = WORD_LADDER_SET
): string[] | null {
  const start = startWord.toUpperCase();
  const target = targetWord.toUpperCase();

  if (start === target) return [start];
  if (!dict.has(start) || !dict.has(target)) return null;

  const queue: string[][] = [[start]];
  const visited = new Set<string>([start]);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];

    for (let i = 0; i < 4; i++) {
      for (let c = 0; c < 26; c++) {
        const char = chars[c];
        if (char === current[i]) continue;
        const candidate = current.slice(0, i) + char + current.slice(i + 1);

        if (candidate === target) {
          return [...path, target];
        }

        if (dict.has(candidate) && !visited.has(candidate)) {
          visited.add(candidate);
          queue.push([...path, candidate]);
        }
      }
    }
  }

  return null;
}

/**
 * Checks if candidate differs from source by exactly one letter.
 */
export function isSingleLetterDiff(w1: string, w2: string): boolean {
  if (w1.length !== 4 || w2.length !== 4) return false;
  let diffCount = 0;
  for (let i = 0; i < 4; i++) {
    if (w1[i] !== w2[i]) diffCount++;
  }
  return diffCount === 1;
}

/**
 * Returns which character index (0-3) changed between w1 and w2.
 */
export function getDiffIndex(w1: string, w2: string): number {
  for (let i = 0; i < 4; i++) {
    if (w1[i] !== w2[i]) return i;
  }
  return -1;
}

/**
 * Validates whether a word is in the dictionary.
 */
export function isValidLadderWord(word: string): boolean {
  return WORD_LADDER_SET.has(word.trim().toUpperCase());
}

/**
 * Scoring based on steps used:
 * - 3 or 4 steps = 15 points
 * - 5 steps = 10 points
 * - 6 or more steps = 5 points
 */
export function calculateLadderScore(steps: number): number {
  if (steps === 3 || steps === 4) return 15;
  if (steps === 5) return 10;
  if (steps >= 6) return 5;
  return 0;
}

/**
 * Deterministically retrieves the Word Ladder challenge for a given date key (YYYY-MM-DD).
 */
export function getDailyWordLadder(dateKey: string): WordLadderPuzzle {
  // Simple hash of dateKey to pick from presets
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  const index = hash % WORD_LADDER_PRESETS.length;
  return WORD_LADDER_PRESETS[index];
}
