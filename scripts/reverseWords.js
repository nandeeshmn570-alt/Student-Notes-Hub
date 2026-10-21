const fs = require("fs");

const fileName = "secret_societies.txt";
const lines = ["Dollar colony", "Gotham's Billioaire"];

fs.writeFileSync(fileName, lines.join("\n"), "utf8");

const fileContent = fs.readFileSync(fileName, "utf8");
const words = fileContent.split(/\s+/);
const reversedWords = [];

for (const word of words) {
  const reversedWord = word.split("").reverse().join("");
  reversedWords.push(reversedWord);
}

console.log(reversedWords.join(" "));
