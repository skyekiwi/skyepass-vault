import secrets from 'secrets.js-grempe'
import crypto from 'eth-crypto'

import { DB, IPFS } from './index'

class Metadata {
	db: DB
	name: string
	encryptionSchema: {
		pieces: number, quorum: number,
		publicPieceCount: number,
		members: Array<string>,
		owner: string,
	}
	ipfs: IPFS
	metadataCid: any

	constructor(encryptionSchema, name: string, ipfs: IPFS, db:DB) {
		this.encryptionSchema = { ...encryptionSchema }
		this.db = db
		this.ipfs = ipfs

		this.name = name
		this.metadataCid = this.db.getCID()

		// pieces = public piece(s) + owner's piece + members' piece(s)
		if (this.encryptionSchema.pieces !== this.encryptionSchema.publicPieceCount
			+ this.encryptionSchema.members.length + 1) {
				throw new Error("wrong pieces count supplied")
		}

		// quorum > pieces : a vault that can never be decrypt
		if (this.encryptionSchema.quorum > this.encryptionSchema.pieces) {
			throw new Error("wrong pieces count supplied")
		}
	}

	async getIPFSMetadataNonce() {
		let nonce = 0
		if (this.metadataCid) {
			const oldMetadata = JSON.parse(await this.ipfs.cat(this.metadataCid))
			return oldMetadata.nonce
		}
		return nonce
	}

	updateEncryptionSchema(newEncryptionSchema) {
		this.encryptionSchema = newEncryptionSchema
	}

	async buildMetadata() {
		// fetch most updated nonce version
		const nonce = await this.getIPFSMetadataNonce()
		const current_nonce = this.db.getNonce()

		if (current_nonce < nonce) {
			throw new Error("Nonce error")
		}

		let metadata = {}
		metadata.pieces = this.encryptionSchema.pieces
		metadata.quorum = this.encryptionSchema.quorum
		metadata.nonce = current_nonce

		metadata.owner = this.encryptionSchema.owner
		metadata.unencrypted_cid = []
		metadata.encrypted_cid = {}

		const msg = this.db.saveUpdates()
		const hexMsg = secrets.str2hex(JSON.stringify(msg))
		const shares = secrets.share(hexMsg,
			this.encryptionSchema.pieces,
			this.encryptionSchema.quorum)

		let pt = 0;

		// first build public pieces
		for (; pt < this.encryptionSchema.publicPieceCount; pt++) {
			metadata.unencrypted_cid.push(await this.upload(shares[pt]))
		}

		// build owner piece
		metadata.encrypted_cid[this.encryptionSchema.owner + ""] = await this.upload(
			await Metadata.encrypt(this.encryptionSchema.owner, shares[pt])
		)
		pt += 1
		
		// if there are members, build member pieces
		if (this.encryptionSchema.members != null) {
			for (let member of this.encryptionSchema.members) {
				metadata.encrypted_cid[member + ""] = 
					await this.upload(await Metadata.encrypt(member, shares[pt]))
				pt += 1
			}
		}

		metadata.name = this.name
		const newCid = await this.upload(JSON.stringify(metadata))

		this.metadataCid = newCid
		this.db.writeCID(newCid)
		return {cid: newCid, result: metadata}
	}

	async upload(content) {
		const result = await this.ipfs.add(content)
		await this.ipfs.pin(result.cid)
		return result.cid.toString()
	}

	async recover(metadata, publicKey, privateKey) {
		// quorum met by 1 keypair supplied + publicPiecesCount
		if (this.encryptionSchema.quorum <= 1 + this.encryptionSchema.publicPieceCount) {
			let contents = new Array()

			// collect all public pieces
			for (let content of metadata.unencrypted_cid)
				contents.push(await this.ipfs.cat(content))

			// find & decrypt the piece related to the keypair supplies
			for (let member in metadata.encrypted_cid) {
				if (member == publicKey)
					contents.push(await Metadata.decrypt(privateKey,
						await this.ipfs.cat(metadata.encrypted_cid[member])))
			}

			const result = await Metadata.recover(contents)

			try {
				return JSON.parse(result)
			} catch (err) {
				console.error(err)
				throw new Error("Decryption Failure")
			}
		} else {
			throw new Error("decryption quorum not met")
		}
	}

	static async encrypt(publicKey, content) {
		return crypto.cipher.stringify(await crypto.encryptWithPublicKey(publicKey, content))
	}
	static async decrypt(privateKey, content) {
		return await crypto.decryptWithPrivateKey(privateKey, crypto.cipher.parse(content))
	}
	static async recover(contents) {
		return await secrets.hex2str(secrets.combine(contents))
	}
}

export {Metadata}
