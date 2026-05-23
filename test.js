const fs = require('fs');
const code = fs.readFileSync('c:/smthshit/bbcode/app.js', 'utf8');

const parseBBCodeCode = code.match(/function parseBBCode\(text\) \{[\s\S]*?return html;\n    \}/)[0];

const testTemplate = `
[divbox=white]
[center][img]https://i.vgy.me/IhV1jB.png[/img][/center]
[/divbox]
[divbox=darkblue]
[size=150][center][b][color=#FFFFFF]Los Santos Police Department [/color][/b][/center][/size]
[/divbox]

[divbox=white]
[center][b][size=120]PATROL REPORT[/size][/b][/center][/divbox]
[lspdsubtitle=#11224E][b]A. GENERAL INFORMATION[/b][/lspdsubtitle]
[divbox=white]
    [b]Officer Name :[/b] 
    [b]Station :[/b] 
    [b]Rank :[/b] 
    [b]Badge Number :[/b] 
[/divbox]
`;

eval(parseBBCodeCode);
try {
    const result = parseBBCode(testTemplate);
    console.log("SUCCESS:");
    console.log(result.substring(0, 200) + "...");
} catch (e) {
    console.error("ERROR:");
    console.error(e);
}
