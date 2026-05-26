// Persistent hunting memory
var _huntTarget = null;

function onIdle(me, enemy, game) {
  var myPos = me.tank.position;
  var myDir = me.tank.direction;
  var enemyTank = enemy.tank;
  var enemyBullet = enemy.bullet;
  var map = game.map;
  var freezeReady = me.skill.remainingCooldownFrames === 0;

  // ===== 1. BULLET DODGE =====
  if (enemyBullet && isComing(myPos, enemyBullet.position, enemyBullet.direction)) {
    var side = perpOpen(myPos, enemyBullet.direction, map);
    if (side) {
      moveToward(me, myDir, myPos, add(myPos, delta(side)));
      return;
    }
    // Fallback: reverse direction
    var back = turnDirection(turnDirection(myDir, "right"), "right");
    if (isOpen(add(myPos, delta(back)), map)) {
      if (myDir === back) { me.go(); return; }
      me.turn(turnDirection(myDir, back));
      return;
    }
    if (isOpen(add(myPos, delta(myDir)), map)) { me.go(); return; }
    me.turn("right");
    return;
  }

  // ===== 2. COMBAT =====
  if (enemyTank) {
    var ePos = enemyTank.position;
    _huntTarget = ePos;
    var dist = Math.abs(myPos[0] - ePos[0]) + Math.abs(myPos[1] - ePos[1]);
    var aligned = isAligned(myPos, ePos);
    var clearShot = aligned && canShoot(myPos, ePos, map);

    if (clearShot) {
      var aimDir = directionTo(myPos, ePos);

      if (myDir !== aimDir) {
        me.turn(turnDirection(myDir, aimDir));
        return;
      }

      if (freezeReady && dist <= 6 && !me.bullet) {
        me.freeze();
        return;
      }

      if (!me.bullet) {
        me.fire();
        return;
      }
      // Bullet in flight, strafe perpendicular to enemy
      var eDir = directionTo(myPos, ePos);
      var perp = (eDir === "up" || eDir === "down") ? ["left", "right"] : ["up", "down"];
      if (isOpen(add(myPos, delta(perp[0])), map)) {
        if (myDir === perp[0]) { me.go(); return; }
        me.turn(turnDirection(myDir, perp[0]));
        return;
      }
      if (isOpen(add(myPos, delta(perp[1])), map)) {
        if (myDir === perp[1]) { me.go(); return; }
        me.turn(turnDirection(myDir, perp[1]));
        return;
      }
      return;
    }

    // Not aligned - close the gap aggressively
    if (freezeReady && dist <= 4 && !me.bullet) {
      // Freeze before closing in so they can't reposition
      me.freeze();
      return;
    }

    var step = nextStep(myPos, ePos, map);
    if (step) { moveToward(me, myDir, myPos, step); return; }
    if (!greedyMove(me, myPos, myDir, ePos, map)) { return; }
    return;
  }

  // ===== 3. STAR (before hunt - more immediate value) =====
  if (game.star) {
    var step = nextStep(myPos, game.star, map);
    if (step) { moveToward(me, myDir, myPos, step); return; }
    if (!greedyMove(me, myPos, myDir, game.star, map)) { return; }
    return;
  }

  // ===== 4. HUNT =====
  if (_huntTarget) {
    var step = nextStep(myPos, _huntTarget, map);
    if (step) { moveToward(me, myDir, myPos, step); return; }
    if (!greedyMove(me, myPos, myDir, _huntTarget, map)) { return; }
    return;
  }

  // ===== 5. EXPLORE =====
  var cx = Math.floor(map.length / 2);
  var cy = Math.floor((map[0] ? map[0].length : 15) / 2);
  var step = nextStep(myPos, [cx, cy], map);
  if (step) { moveToward(me, myDir, myPos, step); return; }
  if (!greedyMove(me, myPos, myDir, [cx, cy], map)) { return; }
  // ===== 6. PATROL =====
  patrol(me, myDir, myPos, map);
}

function greedyMove(me, pos, dir, target, map) {
  var moveDir = directionTo(pos, target);
  var fwd = add(pos, delta(moveDir));
  if (isOpen(fwd, map)) {
    if (dir === moveDir) { me.go(); return true; }
    me.turn(turnDirection(dir, moveDir));
    return true;
  }
  var perp = (moveDir === "up" || moveDir === "down") ? ["left", "right"] : ["up", "down"];
  for (var i = 0; i < perp.length; i++) {
    if (isOpen(add(pos, delta(perp[i])), map)) {
      if (dir === perp[i]) { me.go(); return true; }
      me.turn(turnDirection(dir, perp[i]));
      return true;
    }
  }
  return false;
}

function isComing(myPos, bulletPos, bulletDir) {
  var dx = bulletPos[0] - myPos[0];
  var dy = bulletPos[1] - myPos[1];
  if (dx === 0 && dy !== 0) return (bulletDir === "down" && dy < 0) || (bulletDir === "up" && dy > 0);
  if (dy === 0 && dx !== 0) return (bulletDir === "right" && dx < 0) || (bulletDir === "left" && dx > 0);
  return false;
}

function perpOpen(pos, dir, map) {
  var dirs = (dir === "up" || dir === "down") ? ["left", "right"] : ["up", "down"];
  for (var i = 0; i < dirs.length; i++) {
    if (isOpen(add(pos, delta(dirs[i])), map)) return dirs[i];
  }
  return null;
}

function moveToward(me, cur, from, to) {
  var d = directionTo(from, to);
  if (cur === d) { me.go(); } else { me.turn(turnDirection(cur, d)); }
}

function patrol(me, cur, pos, map) {
  var fwd = add(pos, delta(cur));
  if (isOpen(fwd, map)) { me.go(); } else { me.turn("right"); }
}

function nextStep(start, goal, map) {
  var q = [{ pos: start, first: null }];
  var seen = {}; seen[key(start)] = true;
  for (var h = 0; h < q.length; h++) {
    var item = q[h];
    if (samePos(item.pos, goal)) return item.first;
    var dirs = ["up", "right", "down", "left"];
    for (var i = 0; i < dirs.length; i++) {
      var n = add(item.pos, delta(dirs[i]));
      var k = key(n);
      if (seen[k] || !isOpen(n, map)) continue;
      seen[k] = true;
      q.push({ pos: n, first: item.first || n });
    }
  }
  return null;
}

function canShoot(a, b, map) {
  if (a[0] !== b[0] && a[1] !== b[1]) return false;
  var d = directionTo(a, b);
  var s = delta(d);
  var p = add(a, s);
  while (!samePos(p, b)) {
    if (!isOpen(p, map)) return false;
    p = add(p, s);
  }
  return true;
}

function isAligned(a, b) { return a && b && (a[0] === b[0] || a[1] === b[1]); }
function directionTo(a, b) {
  if (b[0] > a[0]) return "right";
  if (b[0] < a[0]) return "left";
  if (b[1] > a[1]) return "down";
  return "up";
}
function turnDirection(cur, tgt) {
  var ds = ["up","right","down","left"];
  var c = ds.indexOf(cur), t = ds.indexOf(tgt);
  if (c < 0 || t < 0) return "right";
  return ((t - c + 4) % 4) === 3 ? "left" : "right";
}
function delta(d) {
  if (d === "up") return [0,-1];
  if (d === "right") return [1,0];
  if (d === "down") return [0,1];
  return [-1,0];
}
function add(p,d) { return [p[0]+d[0], p[1]+d[1]]; }
function isOpen(p,m) {
  if (!m[p[0]]) return false;
  var c = m[p[0]][p[1]];
  return c && c !== "x" && c !== "m";
}
function samePos(a,b) { return a[0]===b[0] && a[1]===b[1]; }
function key(p) { return p[0]+","+p[1]; }
