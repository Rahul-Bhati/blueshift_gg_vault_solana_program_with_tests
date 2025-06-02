import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import { BlueshiftAnchorVault } from "../target/types/blueshift_anchor_vault";
import { publicKey } from "@coral-xyz/anchor/dist/cjs/utils";
import { assert } from "chai";

describe("blueshift_anchor_vault", async() => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  let Lamports = 1000000000;

  const program = anchor.workspace.blueshiftAnchorVault as Program<BlueshiftAnchorVault>;

  // create user keypair
  const user = anchor.web3.Keypair.generate();

  // initalise vault
  let vaultPda: anchor.web3.PublicKey; let vault_bump: number;

  before(async () => {
    // add some sol/airdrop
    const sign = await provider.connection.requestAirdrop(user.publicKey, 10_000_000_000);
    
    // then confirsm the transaction
    const txn = await provider.connection.confirmTransaction(sign);
    console.log("trasactions ", txn);

    [vaultPda, vault_bump] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), user.publicKey.toBuffer()], 
      program.programId
    );
  })

  it("deposit!", async () => {
    // Add your test here.

    const amount = new BN(1_000_000); // it mean 0,001 SOL
    
    // user balance before deposit
    const user_balance_before = await provider.connection.getBalance(user.publicKey); 
    const vault_balance_before = await provider.connection.getBalance(vaultPda); 

    console.log("================================= Before Deposit in Vault ==================");
    console.log("User Balance : ", user_balance_before);
    console.log("Vault Balance : ", vault_balance_before);
    
    const tx = await program.methods.deposit(amount).accounts({
      signer: user.publicKey, 
      vault: vaultPda, 
      systemProgram: anchor.web3.SystemProgram.programId
    })
    .signers([user])
    .rpc();

    console.log("Deposit transaction signature: ", tx);


    console.log("================================= After Deposit in Vault ==================");
    const user_balance_after = await provider.connection.getBalance(user.publicKey); 
    const vault_balance_after = await provider.connection.getBalance(vaultPda); 
    console.log("User Balance : ", user_balance_after);
    console.log("Vault Balance : ", vault_balance_after);

    // Assert user balance decreased (accounting for transaction fees)
    assert.approximately(
      user_balance_before - user_balance_after,
      amount.toNumber(),
      10_000,
      "User balance should decrease by deposit amount"
    );
    // Assert vault balance increased
    assert.equal(
      vault_balance_after - vault_balance_before,
      amount.toNumber(),
      "Vault balance should increase by deposit amount"
    );

    console.log("Your transaction signature", tx);
  });

  it("Withdraw!", async () => {    
    // user balance before withdraw
    const user_balance_before = await provider.connection.getBalance(user.publicKey); 
    const vault_balance_before = await provider.connection.getBalance(vaultPda); 

    console.log("================================= Before withdraw in Vault ==================");
    console.log("User Balance : ", user_balance_before);
    console.log("Vault Balance : ", vault_balance_before);
    
    const tx = await program.methods.withdraw().accounts({
      signer: user.publicKey, 
      vault: vaultPda, 
      systemProgram: anchor.web3.SystemProgram.programId
    })
    .signers([user])
    .rpc();

    console.log("withdraw transaction signature: ", tx);


    console.log("================================= After withdraw in Vault ==================");
    const user_balance_after = await provider.connection.getBalance(user.publicKey); 
    const vault_balance_after = await provider.connection.getBalance(vaultPda); 
    console.log("User Balance : ", user_balance_after);
    console.log("Vault Balance : ", vault_balance_after);

    // Assert user balance increased
    assert.isAbove(
      user_balance_after,
      user_balance_before,
      "User balance should decrease by deposit amount"
    );
    // Assert vault balance decreased
    assert.isBelow(
      vault_balance_after,
      vault_balance_before,
      "Vault balance should increase by deposit amount"
    );

    console.log("Your transaction signature", tx);
  });
});
