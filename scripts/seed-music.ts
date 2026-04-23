import { prisma } from "@arquiteure/db";

const POSTS = [
  {
    title: "Bohemian Rhapsody",
    artist: "Queen",
    description: "Clássico do rock progressivo de 1975.",
    audioUrl: null,
    coverUrl: null,
    tags: ["rock", "clássico", "Queen"],
  },
  {
    title: "Blinding Lights",
    artist: "The Weeknd",
    description: "Hit de 2019 com influências synth-pop dos anos 80.",
    audioUrl: null,
    coverUrl: null,
    tags: ["pop", "synth", "2019"],
  },
  {
    title: "Alright",
    artist: "Kendrick Lamar",
    description: "Hino do álbum To Pimp a Butterfly (2015).",
    audioUrl: null,
    coverUrl: null,
    tags: ["hip-hop", "rap", "Kendrick"],
  },
  {
    title: "Shape of You",
    artist: "Ed Sheeran",
    description: "Um dos singles mais transmitidos de sempre.",
    audioUrl: null,
    coverUrl: null,
    tags: ["pop", "Ed Sheeran"],
  },
  {
    title: "Bad Guy",
    artist: "Billie Eilish",
    description: "Pop alternativo e baixo pesado de 2019.",
    audioUrl: null,
    coverUrl: null,
    tags: ["pop", "alternativo", "Billie Eilish"],
  },
];

async function main() {
  console.log("[seed-music] A semear publicações de música…");
  for (const p of POSTS) {
    await prisma.musicPost.upsert({
      where: {
        id: `seed-${p.title.toLowerCase().replace(/\s+/g, "-")}`,
      },
      create: {
        id: `seed-${p.title.toLowerCase().replace(/\s+/g, "-")}`,
        ...p,
      },
      update: {},
    });
  }
  console.log(`[seed-music] ${POSTS.length} publicações inseridas.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
