var starter = "{:plasticcost|:}{:metalcost|:}{:buttoncost|:}{:filter|:}";
var material = "{:newmaterial|cost|{:`material|name|{{#ifeq|{{{name}}}|tostring|[cost: {{{cost}}}]|{{#ifeq|{{{name}}}|getcost|{{{cost}}} }} }}:}:}";
var plastic = "{:newplastic|chemical|plasticcost|{:`plastic|name|{{#ifeq|{{{name}}}|tostring|[chemical: {{{chemical}}}, cost: {{ {{newmaterial|{{#ifeq|{{{plasticcost}}}|[object Object]|default|{{{plasticcost}}}}} }}|getcost}}]|{{#ifeq|{{{name}}}|getchemical|{{{chemical}}}|{{ {{newmaterial|{{#ifeq|{{{plasticcost}}}|[object Object]|default|{{{plasticcost}}}}} }}|{{{name}}} }} }} }}:}:}";
var metal = "{:newmetal|ferrous|metalcost| {:`metal|name|{{#ifeq|{{{name}}}|tostring| [ferrous: {{{ferrous}}}, cost: {{ {{newmaterial| {{#ifeq|{{{metalcost}}}|[object Object]|default|{{{metalcost}}}}} }}|getcost}}]|{{#ifeq|{{{name}}}|getferrous|{{{ferrous}}}|{{ {{newmaterial|{{#ifeq|{{{metalcost}}}|[object Object]|default|{{{metalcost}}}}} }}|{{{name}}} }} }} }}:}:}";

var attachment = "{:newattachment|{:`attachment|name|:}:}";
var holed = "{:newholed|number|{:`holed|name|{{#ifeq|{{{name}}}|tostring|[number: {{{number}}}]| {{#ifeq|{{{name}}}|getnumber|{{{number}}} }} }}:}:}";
var shank = "{:newshank|selfshank|{:`shank|name|{{#ifeq|{{{name}}}|tostring|[selfshank: {{{selfshank}}}]|{{#ifeq|{{{name}}}|getselfshank|{{{selfshank}}} }} }}:}:}";

var button = "{:newbutton|mtype|atype|lignenumber|marg|aarg|buttoncost|{:`|name|{{#ifeq|{{{name}}}|tostring|[lignenumber: {{{lignenumber}}}, material: {{{mtype}}}, {{#ifeq|{{{mtype}}}|plastic|chemical: {{{marg}}}|ferrous: {{{marg}}} }}, cost: {{ {{newmaterial|{{#ifeq|{{{buttoncost}}}|[object Object]|default|{{{buttoncost}}}}} }}|getcost}}, attachment: {{{atype}}}, {{#ifeq|{{{atype}}}|holed|number: {{{aarg}}}|selfshank: {{{aarg}}} }}]|{{#ifeq|{{{name}}}|getmaterialtype|{{{mtype}}}|{{#ifeq|{{{name}}}|getattachmenttype|{{{atype}}}|{{ #ifeq|{{{mtype}}}|plastic|{{ {{newplastic|{{{marg}}}|{{{buttoncost}}} }}| {{{name}}} }}|{{ {{ newmetal|{{{marg}}}|{{{buttoncost}}} }}|{{{name}}} }} }}{{#ifeq|{{{atype}}}|holed|{{ {{newholed|{{{aarg}}} }}|{{{name}}} }}|{{ {{newshank|{{{aarg}}} }}|{{{name}}} }}}} }} }} }}:}:}";


var cons = "{:cons|{:`|x|y| {:`|f|{{ {{{f}}}|{{{x}}}|{{{y}}} }}:}:}:}";
var car = "{:car|{:`|c|{{ {{{c}}}| {:`t|x|y|{{{x}}}:} }}:}:}";
var cdr = "{:cdr|{:`|c| {{#ifeq|{{{c}}}|null|null|{{ {{{c}}}| {:`t|x|y|{{{y}}}:} }} }} :}:}";


var iterator = "{:iterate|list|filter|{{#ifeq|{{{list}}}|null||{{#ifeq|{{{filter}}}|[object Object]|<tr><td>{{ {{ {{car}}|{{{list}}} }} | tostring }}</td></tr>|" + "{{#ifeq|{{ {{ {{car}}|{{{list}}} }} | getmaterialtype }}|{{{filter}}}|<tr><td>{{ {{ {{car}}|{{{list}}} }} | tostring }}</td></tr>| {{#ifeq|{{ {{ {{car}}|{{{list}}} }} | getattachmenttype }}|{{{filter}}}|<tr><td>{{ {{ {{car}}|{{{list}}} }}|tostring }}</td></tr>|}} }} " + "}}{{iterate|{{ {{cdr}}|{{{list}}} }}|{{{filter}}} }} }}:}";
var buttoncollection = "{:buttoncollection|buttons|title|filter|<table style='border: 1px solid black; width:100%'><tr><td>{{{title}}}</td></tr>{{iterate|{{{buttons}}}|{{{filter}}} }}</table>:}";

var str = "";
str += starter + material + plastic + metal + attachment + holed + shank + button;
str += cons + car + cdr;
str += iterator + buttoncollection;

// =============================================================================================== //

// change buttons here to get html table please
var button1 = "{{newbutton|plastic|shank|2.6|poly|integral|123}}";
var button2 = "{{newbutton|plastic|shank|3.0|non-poly|separate|88}}";
var button3 = "{{newbutton|plastic|shank|2.5|polyurethane|integral}}";
var button4 = "{{newbutton|metal|holed|1.0|no-ferrous|4|50}}";
var button5 = "{{newbutton|plastic|holed|4.0|unknown chemical|2|99}}";
var button6 = "{{newbutton|plastic|holed|3.9|PVC|3|75}}";
var button7 = "{{newbutton|metal|shank|7.2|no-ferrous|integral}}";
var button8 = "{{newbutton|metal|shank|0.8|has ferrous|separate|32}}";
var button9 = "{{newbutton|metal|holed|6.4|has ferrous|4}}";
var button10 = "{{newbutton|plastic|holed|3.2|regular plastic|4|108}}";

// change button list here to get html table please
var list = "{{ {{cons}} |" + button1 + "|" + "null" + "}}";
list = "{{ {{cons}} |" + button2 + "|" + list + "}}";
list = "{{ {{cons}} |" + button3 + "|" + list + "}}";
list = "{{ {{cons}} |" + button4 + "|" + list + "}}";
list = "{{ {{cons}} |" + button5 + "|" + list + "}}";
list = "{{ {{cons}} |" + button6 + "|" + list + "}}";
list = "{{ {{cons}} |" + button7 + "|" + list + "}}";
list = "{{ {{cons}} |" + button8 + "|" + list + "}}";
list = "{{ {{cons}} |" + button9 + "|" + list + "}}";
list = "{{ {{cons}} |" + button10 + "|" + list + "}}";


// change title and filter here to get html table please
var title = "Table of Buttons";
var filter = "";

if (filter === "") {
    str += "{{buttoncollection|" + list + "|" + title + "}}";
} else {
    str += "{{buttoncollection|" + list + "|" + title + "|" + filter + "}}";
}

var AST = parseOuter(str);
var globalEnv = createEnv(null);
var table = evalWML(AST, globalEnv);
console.log("\nTable HTML:\n" + table);

/*

 ---------- Recommended Usage ----------

 <!DOCTYPE html>
 <html>
 <head>
 <title>Table</title>
 <script src="assig2.js"></script>
 <script src="assig3.js"></script>
 <script src="q2.js"></script>
 </head>
 <body id="body">
 <script>

 document.getElementById('body').innerHTML = table;

 </script>
 </body>
 </html>

 ----------------- End -----------------

 */