import { promises as fs } from "fs";
import process from "process";

const tabulate = (ballots: string[][], categories: Set<string>) => {
  const votes = ballots.reduce(
    (tab, bal) => {
      tab[bal[0]]++;
      return tab;
    },
    Array.from(categories).reduce((cur, cat) => {
      cur[cat] = 0;
      return cur;
    }, {})
  );

  Object.entries(votes).forEach((ent) => {
    votes[ent[0]] = ent[1] as number / ballots.length;
  });

  return votes;
};

const run = async () => {
  if (process.argv.length != 4) {
    console.error(`Usage: ${process.argv[0]} <csv_file> <RCV_col>`);
    console.error(process.argv);
    process.exit(1);
  }

  let data: string;
  try {
    const dataRaw = await fs.readFile(process.argv[2]);

    data = dataRaw.toString();
  } catch (e) {
    console.error("Failed to read CSV");
    console.error(e);
    process.exit(1);
  }

  let col: number;
  try {
    col = parseInt(process.argv[3]);
  } catch (e) {
    console.error("Not a valid column number");
    console.error(`Usage: ${process.argv[0]} <csv_file> <RCV_col>`);
    console.error(e);
    process.exit(1);
  }

  let ballots = data
    .split("\n")
    .map((line) => line.trim().replace(/\r|\t|"/g, "").trim())
    .filter((line) => line.split(",")[col - 1] !== undefined)
    .map((line) => line.split(",")[col - 1].split(";").map(s => s.trim()).filter(s => s.length > 0));

  // Remove invalid ballots
  ballots = ballots.filter(ballot => ballot.length > 1);

  const categories = ballots.reduce(
    (combined, ballot) => new Set<string>([...ballot, ...combined]),
    new Set<string>()
  );

  let currRound = 1;
  let isWinner = false;
  let votesAsEntries: [string, number][];
  let votes: object;
  do {
    votes = tabulate(ballots, categories);
    votesAsEntries = Object.entries(votes);
    isWinner = votesAsEntries.some(ent => ent[1] > 0.5);

    console.log(`Round ${currRound}:`);

    if(isWinner) {
      break;
    } else if (!ballots.some(b => b[0] !== undefined)) {
        console.error("\tCould not find a winner :(");
        break;
    } else if(!isWinner) {
        const aLoser = votesAsEntries.reduce((currMin, currEnt) => currEnt[1] < currMin[1] ? currEnt : currMin, votesAsEntries[0]);
        const allLosers = votesAsEntries.filter(ent => ent[1] === aLoser[1]);
        console.log("\tEliminating losers: \n", allLosers.map(ent => `\t\t${ent[0]}: ${Math.round(ent[1] * 100)}%`).join("\n"));
        const losersAsSet = new Set(allLosers.map(loser => loser[0]));
        ballots = ballots.map(ballot => ballot.map(vote => losersAsSet.has(vote) ? undefined : vote))

        // Shift votes until not undefined
        ballots = ballots.map(ballot => {
            while(ballot.length > 0 && ballot[0] === undefined) {
                ballot.shift();
            }
            return ballot;
        });

        losersAsSet.forEach(loser => categories.delete(loser));

        currRound ++;
    }
    

  } while(!isWinner && currRound < 1000);
  
  console.log("\tWinner: ", votesAsEntries.find(ent => ent[1] > 0.5)[0]);
  console.log("\tRemaining Votes: \n", votesAsEntries.map(ent => `\t\t${ent[0]}: ${Math.round(ent[1] * 100)}%`).join("\n"))

  if(!isWinner) {
    console.error("\tCould not find a winner :(");
    console.error(votes);
  }
};

run();
