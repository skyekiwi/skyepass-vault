import low from 'lowdb'
import FileSync from 'lowdb/adapters/FileSync'
import {v4 as uuid} from 'uuid'

class DB {
	db: low

	constructor(file: string) {
		try {
			this.db = low(new FileSync(file))
			this.db.defaults({
				'package': {
					"last_cid": "",
					"nonce": 0,
					"common": ['password.skye.kiwi', 'notes.skye.kiwi'],
					"installed": []
				},
				'password.skye.kiwi': [],
				'note.skye.kiwi': [],
				'creditcard.skye.kiwi': [],
				'polkadot.wallet.skye.kiwi': [],
				'ethereum.wallet.skye.kiwi': [],
			}).write()
		} catch (err) {
			console.error(err)
			throw (new Error('database error'))
		}
	}

	public addItem(appId:string, content:any) {
		if (this.db.get(appId).value() == undefined) {
			throw(new Error('not a valid AppID'))
		}

		content.uuid = uuid()
		try {
			this.db.get(appId).push(content).write() } 
		catch (err) {
			console.error(err)
			throw (new Error('database error'))
		}
	}
	
	public readItems(appId:string) {
		try { return this.db.get(appId).value().sort() } 
		catch (err) { 
			console.error(err)
			throw(new Error('database error'))
		}
	}

	public deleteItem(appId:string, uuid:uuid) {
		try { this.db.get(appId).remove((x) => x.uuid == uuid).write() }
		catch (err) { 
			console.error(err)
			throw(new Error('database error'))
		}
	}

	public updateItem(appId:string, uuid:uuid, content:any) {
		try { 
			content.uuid = uuid
			this.db.get(appId).remove((x) => x.uuid == uuid).write()
			this.db.get(appId).push(content).write() 
		} catch (err) { 
			console.error(err)
			throw(new Error('database error'))
		}
	}

	public installApp(appId:string, appMetadata:object) {
		try {
			this.db.get('package.installed').push(appId).write()
			this.db.setWith(`package.["${appId}"]`, appMetadata).write()
			this.db.setWith(`["${appId}"]`, []).write()
		} catch(err) {
			console.error(err)
			throw(new Error('database error'))
		}
	}

	public getMetadata() {
		try { return this.db.get('package').value() }
		catch(err) {
			console.error(err)
			throw(new Error('database error'))
		}
	}
	public getNonce() {
		try {
			return this.db.get('package.nonce').value()
		} catch (err) {
			console.error(err)
			throw (new Error('database error'))
		}
	}
	public saveUpdates() {
		try {
			this.db.update('package.nonce', n => n + 1).write()
			return this.db.getState()
		} catch (err) {
			console.error(err)
			throw (new Error('database error'))
		}
	}
	public writeCID(cid) {
		try {
			this.db.set('package.last_cid', cid).write()
		} catch (err) {
			console.error(err)
			throw (new Error('database error'))
		}
	}
	public getCID(){
		try {
			return this.db.get('package.last_cid').value()
		} catch (err) {
			console.error(err)
			throw (new Error('database error'))
		}
	}
	public toJson() {
		try {
			return this.db.getState()
		} catch (err) {
			console.error(err)
			throw (new Error('database error'))
		}
	}
}
export {DB}
