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
    .map((line) => line.replace("\r", ""))
    .filter((line) => line.split(",")[col - 1] !== undefined)
    .map((line) => line.split(",")[col - 1].split(";"));

  // Remove invalid ballots
  ballots = ballots.filter(ballot => ballot.length > 1);

  const categories = ballots.reduce(
    (combined, ballot) => new Set<string>([...ballot, ...combined]),
    new Set<string>()
  );

  let currRound = 1;
  let isWinner = false;
  do {
    let votes = tabulate(ballots, categories);
    let votesAsEntries = Object.entries(votes) as [string, number][];
    isWinner = votesAsEntries.some(ent => ent[1] > 0.5);

    console.log(`Round ${currRound}:`);
    console.log("\tBallots: ");
    console.log(ballots);
    console.log("\tVotes: ");
    console.log(votes);
    console.log();

    if(isWinner) {
        console.log("DONE");
    } else if (!ballots.some(b => b[0] !== undefined)) {
        console.error("\tCould not find a winner :(");
        break;
    } else if(!isWinner) {
        const loser = votesAsEntries.reduce((currMin, currEnt) => currEnt[1] < currMin[1] ? currEnt : currMin, votesAsEntries[0]);
        console.log("\tRemoving loser...", loser);
        ballots = ballots.map(ballot => ballot.map(vote => vote == loser[0] ? undefined : vote))

        // Shift votes until not undefined
        ballots = ballots.map(ballot => {
            while(ballot.length > 0 && ballot[0] === undefined) {
                ballot.shift();
            }
            return ballot;
        });

        currRound ++;
    }
    

  } while(!isWinner && currRound >= categories.size);
  

  if(!isWinner) {
    console.error("\tCould not find a winner :(");
  }
};

run();
