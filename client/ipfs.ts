import createClient from 'ipfs-http-client'

class IPFSConfig {
	host: string
	port: number
	protocol: 'https' | 'http' | 'ws'

	constructor(host: string, port: number, protocol: 'https' | 'http' | 'ws') {
		this.host = host
		this.port = port
		this.protocol = protocol
	}
}

class IPFS {
	private client: any

	constructor(config: IPFSConfig) {
		this.client = createClient(config)
	}
	
	public async add(str:string) {
		try {
			return await this.client.add(str)
		} catch (err) {
			console.error(err)
			throw (new Error('IPFS Failure'))
		}
	}
	public async cat(cid:string) {
		// TODO: check CID validity
		let result = ''
		try {
			const stream = this.client.cat(cid)
			for await (const chunk of stream) {
				result += chunk.toString()
			}
			return result
		} catch(err) {
			console.error(err)
			throw (new Error('IPFS Failure'))
		}
	}
	public async pin(cid:string) {
		try {
			return await this.client.pin.add(cid)
		} catch (err) {
			console.error(err)
			throw (new Error('IPFS Failure'))
		}
	}
}
export {IPFS}
