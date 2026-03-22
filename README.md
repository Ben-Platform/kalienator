# Kalienator


## Overview
A CLI-based Effectful program for running your [Kalien](https://kalien.xyz/)-earning operations 24x7.


## But first, Thank you Fred!
We're using Fred's miner for all things mining! 100% efficiency, he has both CPU and GPU versions. 

Check out his Github: https://github.com/fredericrezeau/kalien-beam, because you will need to have such a miner in place. 

Many thanks to his many contributions to both the [Stellar](https://stellar.org/) and [Kale](https://kalefarm.xyz/about/) ecosystems!


## Features
- Effect-based program! Read more at Effect: https://effect.website
- Kalien API handling (seeds, tape submissions, retry logic, etc.)
- Miner program handling, with kill-switch based on seed expiration.
- 24x7 run-and-forget mode.


## Pre-requisites 
- Create an account at https://kalien.xyz, you'll need the account's address.
- You'll need Deno 2.x, check how to install at https://deno.com


## Installation
- Git clone this repo into local setup
- Move into your local setup, and `deno install` to install dependencies (basically Effect)
- **Write your wallet address in PLAYER_ADDRESS found in the `.env` file** (you can use the account's address you created on pre-requisites)
- Tweak further the miner options in .env if you want to, as you see fit (though defaults are there)
- Make sure you have a Kalien miner in your /bin directory. We have a pre-compiled binary (Windows) in our Github Releases, so you can just `deno task setup` to install it.


## Usage
After making sure you've gone through `Pre-requisites` and `Installation`, you can now run the Kalienator:

```bash
deno task prod
```


## License
MIT. 

