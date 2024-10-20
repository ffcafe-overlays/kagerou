'use strict'
;(function () {
  const NICK_REGEX = / \(([\uac00-\ud7a3']{1,9}|[A-Z][a-z' ]{0,15})\)$/

  const toArray = (o) => Object.keys(o).map((_) => o[_])
  const SORTABLE = {}

  COLUMN_SORTABLE.forEach((_) => {
    let k = _.substr('+-'.indexOf(_[0]) >= 0)
    let o = resolveDotIndex(COLUMN_INDEX, k)
    SORTABLE[k] = o.v || o
  })

  class Data {
    constructor(data) {
      // reconstruct
      this.update(data)
      this.isCurrent = true
      this.saveid =
        `kagerou_save_${Date.now()}` + sanitize(this.header.CurrentZoneName)
    }

    update(data) {
      this.isActive = data.isActive
      this.header = data.Encounter
      this.data = toArray(data.Combatant)
      this.calculateMax(data.Combatant)
    }

    get(sort, merged) {
      let r = this.data.slice(0)

      if (merged) {
        let players = {}
        let haveYou = r.some((_) => _.name === 'YOU')

        for (let o of r) {
          let name = o.name
          let job = (o.Job || '').toUpperCase()
          let mergeable = VALID_PLAYER_JOBS.indexOf(job) === -1
          let owner = resolveOwner(name)
          let isUser = !owner && !mergeable

          if (
            haveYou &&
            window.config.get('format.myname').indexOf(owner) != -1
          ) {
            owner = 'YOU'
          }
          owner = owner || name

          if (!players[owner]) {
            players[owner] = Object.assign({}, o)
          } else {
            let patch = {}

            // let keys = Object.keys(players[owner])
            for (let k of COLUMN_MERGEABLE) {
              let v1 = pFloat(o[k])
              let v2 = pFloat(players[owner][k])
              patch[k] = (isNaN(v1) ? 0 : v1) + (isNaN(v2) ? 0 : v2)
            }

            for (let t in COLUMN_USE_LARGER) {
              let targets = COLUMN_USE_LARGER[t]
              let v
              let v1 = pInt(o[t])
              let v2 = pInt(players[owner][t])

              if (v1 > v2 || isNaN(v2)) v = o
              else if (v1 <= v2 || isNaN(v1)) v = players[owner]

              for (let k of targets) {
                patch[k] = v[k]
              }
            }

            if (isUser) {
              players[owner] = Object.assign({}, o, patch)
            } else {
              players[owner] = Object.assign({}, players[owner], patch)
            }
          }
        }
        r = toArray(players)
      }

      r = this.sort(sort, r)

      return [r, this.calculateMax(r)]
    }

    sort(key, target) {
      let d = ('+-'.indexOf(key[0]) + 1 || 1) * 2 - 3
      let k = SORTABLE[key.substr('+-'.indexOf(key[0]) >= 0)]
      ;(target || this.data).sort((a, b) => (pFloat(a[k]) - pFloat(b[k])) * d)

      if (target) return target
    }

    calculateMax(combatant) {
      let max = {}

      for (let k in SORTABLE) {
        let v = SORTABLE[k]
        max[k] = Math.max.apply(
          Math,
          Object.keys(combatant).map((_) => combatant[_][v]),
        )
      }

      return max
    }

    finalize() {
      this.isCurrent = false
      return this.saveid
    }
  }

  class History {
    constructor() {
      this.lastEncounter = false
      this.currentData = false
      this.history = {}
    }

    push(data) {
      if (!data || !data.Encounter || data.Encounter.hits < 1) return

      if (this.isNewEncounter(data.Encounter, data.isActive)) {
        if (
          config.get('format.myname').length === 0 &&
          NICK_REGEX.test(data.Encounter.title)
        ) {
          let nick = NICK_REGEX.exec(data.Encounter.title)[1]
          config.set('format.myname', [nick])
          config.save()
        }
        if (this.currentData) {
          let id = this.currentData.finalize()
          this.history[id] = {
            id: id,
            title: this.currentData.header.title,
            region: this.currentData.header.CurrentZoneName,
            duration: this.currentData.header.duration,
            dps:
              this.currentData.header.damage / this.currentData.header.DURATION,
            data: this.currentData,
          }
        }

        this.currentData = new Data(data)
      } else {
        this.currentData.update(data)
      }
    }

    updateLastEncounter(encounter, isActive) {
      this.lastEncounter = {
        hits: encounter.hits,
        region: encounter.CurrentZoneName,
        damage: encounter.damage,
        duration: parseInt(encounter.DURATION),
        isActive: isActive,
      }
    }

    isNewEncounter(encounter, isActive) {
      let really =
        !this.lastEncounter ||
        this.lastEncounter.region !== encounter.CurrentZoneName ||
        this.lastEncounter.isActive !== isActive
        // ACT-side bug (scrambling data) making this invalid!
        // || this.lastEncounter.duration > parseInt(encounter.DURATION)
        // || this.lastEncounter.damage > encounter.damage
        // || this.lastEncounter.hits > encounter.hits
      this.updateLastEncounter(encounter, isActive)
      return really
    }

    get list() {
      return this.history
    }

    get current() {
      return this.currentData
    }

    browse(id) {
      return this.history[id]
    }
  }

  window.Data = Data
  window.History = History
})()
