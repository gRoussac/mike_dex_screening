const express = require('express');
const router = express.Router();
const axios = require('axios');
global.fetch = require('node-fetch');

const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const { Metaplex, keypairIdentity } = require('@metaplex-foundation/js');

require('dotenv').config();

const secretKeyString = process.env.SECRET_KEY;
const secretKeyArray = secretKeyString
  .split(',')
  .map((num) => parseInt(num, 10));

const SECRET_KEY = Uint8Array.from(secretKeyArray);
const wallet = Keypair.fromSecretKey(SECRET_KEY);
const pubKey = wallet.publicKey;

const metadata_file_uri =
  'http://roussac.free.fr/mike_dex_screening/roussac-nft.json';

const tokenAddress = '5oQbWDQHYHKdUq5qEo6nXaseY7PuURtQkaJWPAwTuPJQ';
const tokenPubKey = new PublicKey(tokenAddress);

router.get('/ApiTest', async (req, res) => {
  try {
    const isFetch = 'fetch' in req.query;

    console.debug(`[${new Date().toISOString()}] fetch=${isFetch}`);

    const nft = await minter(isFetch);

    if (!nft) {
      console.error('No NFT returned');
      return res.status(500).send('NFT not found\n');
    }

    let metadataResponse;
    try {
      metadataResponse = await axios.get(nft.uri);
    } catch (axiosErr) {
      return res
        .status(500)
        .send('Failed to fetch metadata\n' + axiosErr.toString());
    }

    const responseBody = {
      onChainData: {
        name: nft.name,
        symbol: nft.symbol,
        sellerFeeBasisPoints: nft.sellerFeeBasisPoints,
        uri: nft.uri,
      },
      metadataJson: metadataResponse.data,
    };

    return res
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(responseBody, null, 2) + '\n');
  } catch (err) {
    return res.status(500).send('Internal server error!\n' + err.stack || err);
  }
});

const minter = async (fetch = true) => {
  const connection = new Connection(
    'https://api.devnet.solana.com',
    'confirmed'
  );

  const metaplex = Metaplex.make(connection).use(keypairIdentity(wallet));
  let nft;

  try {
    if (!fetch) {
      console.debug(`Minting NFT for : ${pubKey.toBase58()}`);
      const name = `My mike_dex NFT ${Math.floor(Math.random() * 1000)}`;

      const result = await metaplex.nfts().create({
        uri: metadata_file_uri,
        name,
        sellerFeeBasisPoints: 100,
      });

      nft = result.nft;
      console.debug('NFT Address:', nft.address.toBase58());
    } else {
      console.debug(`Fetching NFT from mint: ${tokenPubKey.toBase58()}`);
      nft = await metaplex.nfts().findByMint({ mintAddress: tokenPubKey });
    }

    if (!nft) {
      throw new Error('NFT object is undefined after mint/fetch');
    }

    return nft;
  } catch (error) {
    console.error('Error in minter():', error);
    throw error;
  }
};

module.exports = router;
