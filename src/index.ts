import { promises as fs } from "fs";
import process from "process";

const compete = (ballot: string[], orderedCategories: string[]) => {
  const competition: number[][] = [];
  for(let r = 0; r < orderedCategories.length; r ++) {
    const currRun = [];
    for(let o = 0; o < orderedCategories.length; o ++) {
        if (o !== r) {
          const runner = orderedCategories[r];
          const opponent = orderedCategories[o];
        
          currRun.push(ballot.find(b => b === runner || b === opponent) === runner ? 1 : 0);
        } else {
          currRun.push(0);
        }
    }
    competition.push(currRun);
  }
  return competition;
}

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

  const orderedCategories = Array.from(categories);

  const ballotPairCompetitions = ballots.map((b) => compete(b, orderedCategories));
  let matSum = ballotPairCompetitions
    .reduce((acc, curr) => {
      for(let r = 0; r < acc.length; r ++) {
        for(let c = 0; c < acc.length; c ++) {
          acc[r][c] += curr[r][c];
        }
      }
      return acc;
    });
  const condorcet = orderedCategories.map((cat,ind) => {
    const winVotes = matSum[ind];
    const lossVotes = matSum.reduce((lossCol, row) => [...lossCol, row[ind]], [])
    let wins = 0;
    for(let i = 0; i < winVotes.length; i ++) {
      wins += winVotes[i] > lossVotes[i] ? 1 : 0;
    }
    return {
      cat,
      tally: wins
    };
  })
  condorcet.sort((a, b) => b.tally - a.tally);
  console.log("Condorcet method: ");
  condorcet.forEach(c => console.log(`\t${c.cat}: ${c.tally}`));

  const bordaSum = ballots.reduce((curr, ballot) => {
    ballot.forEach((b, index) => {
      if (curr[b] === undefined) {
        curr[b] = index;
      } else {
        curr[b] += index;
      }
    });
    return curr;
  }, {});
  const bordaRes = Object.entries(bordaSum).map<{ cat: string; tally: number }>(ent => ({ cat: ent[0], tally: ent[1] as any }));
  bordaRes.sort((a, b) => a.tally - b.tally);
  console.log("Borda method: ");
  bordaRes.forEach(c => console.log(`\t${c.cat}: ${c.tally}`));
};

run();
