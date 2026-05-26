// Memory
var _huntPos = null;

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
    // Fallback: just go back where we came from
    var back = turnDirection(turnDirection(myDir, "right"), "right");
    if (isOpen(add(myPos, delta(back)), map)) {
      if (myDir === back) { me.go(); return; }
      me.turn(turnDirection(myDir, back));
      return;
    }
    // Last resort: keep going forward
    if (isOpen(add(myPos, delta(myDir)), map)) { me.go(); return; }
    me.turn("right");
    return;
  }

  // ===== 2. COMBAT =====
  if (enemyTank) {
    var ePos = enemyTank.position;
    _huntPos = ePos;
    var dist = Math.abs(myPos[0] - ePos[0]) + Math.abs(myPos[1] - ePos[1]);
    var aligned = isAligned(myPos, ePos);
    var clearShot = aligned && canShoot(myPos, ePos, map);

    // Close range combat (dist <= 6)
    if (dist <= 6) {
      // Freeze aggressively at close range
      if (freezeReady && !me.bullet) {
        me.freeze();
        return;
      }
      // If we just froze (previous frame), now align and fire
      if (clearShot) {
        var aimDir = directionTo(myPos, ePos);
        if (myDir !== aimDir) {
          me.turn(turnDirection(myDir, aimDir));
          return;
        }
        if (!me.bullet) { me.fire(); return; }
      }
    }

    // General combat (any range)
    if (clearShot) {
      var aimDir = directionTo(myPos, ePos);
      if (myDir !== aimDir) {
        me.turn(turnDirection(myDir, aimDir));
        return;
      }
      if (!me.bullet) { me.fire(); return; }
      // Bullet in flight - reposition
      greedyMove(me, myPos, myDir, ePos, map);
      return;
    }

    // Navigate closer - prefer greedy approach
    if (!greedyMove(me, myPos, myDir, ePos, map)) {
      // BFS fallback
      var step = nextStep(myPos, ePos, map);
      if (step) { moveToward(me, myDir, myPos, step); return; }
    }
    return;
  }

  // ===== 3. HUNT =====
  if (_huntPos) {
    if (!greedyMove(me, myPos, myDir, _huntPos, map)) {
      var step = nextStep(myPos, _huntPos, map);
      if (step) { moveToward(me, myDir, myPos, step); return; }
    }
    return;
  }

  // ===== 4. STAR =====
  if (game.star) {
    if (!greedyMove(me, myPos, myDir, game.star, map)) {
      var step = nextStep(myPos, game.star, map);
      if (step) { moveToward(me, myDir, myPos, step); return; }
    }
    return;
  }

  // ===== 5. EXPLORE =====
  var cx = Math.floor(map.length / 2);
  var cy = Math.floor((map[0] ? map[0].length : 15) / 2);
  if (!greedyMove(me, myPos, myDir, [cx, cy], map)) {
    var step = nextStep(myPos, [cx, cy], map);
    if (step) { moveToward(me, myDir, myPos, step); return; }
  }
  // ===== 6. PATROL =====
  patrol(me, myDir, myPos, map);
}

// Greedy movement: try to move toward target, with perpendicular fallback
function greedyMove(me, pos, dir, target, map) {
  var moveDir = directionTo(pos, target);
  var fwd = add(pos, delta(moveDir));

  if (isOpen(fwd, map)) {
    if (dir === moveDir) { me.go(); return true; }
    me.turn(turnDirection(dir, moveDir));
    return true;
  }

  // Try perpendicular to blocked direction
  var perp = (moveDir === "up" || moveDir === "down") ? ["left", "right"] : ["up", "down"];
  for (var i = 0; i < perp.length; i++) {
    var p = add(pos, delta(perp[i]));
    if (isOpen(p, map)) {
      if (dir === perp[i]) { me.go(); return true; }
      me.turn(turnDirection(dir, perp[i]));
      return true;
    }
  }
  return false; // caller should use BFS
}

function isComing(myPos, bulletPos, bulletDir) {
  var dx = bulletPos[0] - myPos[0];
  var dy = bulletPos[1] - myPos[1];
  if (dx === 0 && dy !== 0) {
    return (bulletDir === "down" && dy < 0) || (bulletDir === "up" && dy > 0);
  }
  if (dy === 0 && dx !== 0) {
    return (bulletDir === "right" && dx < 0) || (bulletDir === "left" && dx > 0);
  }
  return false;
}

function perpOpen(pos, dir, map) {
  var dirs = (dir === "up" || dir === "down") ? ["left", "right"] : ["up", "down"];
  for (var i = 0; i < dirs.length; i++) {
    if (isOpen(add(pos, delta(dirs[i])), map)) return dirs[i];
  }
  return null;
}

function moveToward(me, currentDir, from, to) {
  var dir = directionTo(from, to);
  if (currentDir === dir) { me.go(); }
  else { me.turn(turnDirection(currentDir, dir)); }
}

function patrol(me, currentDir, position, map) {
  var forward = add(position, delta(currentDir));
  if (isOpen(forward, map)) { me.go(); }
  else { me.turn("right"); }
}

function nextStep(start, goal, map) {
  var queue = [{ pos: start, first: null }];
  var seen = {}; seen[key(start)] = true;
  for (var head = 0; head < queue.length; head++) {
    var item = queue[head];
    if (samePos(item.pos, goal)) return item.first;
    var dirs = ["up", "right", "down", "left"];
    for (var i = 0; i < dirs.length; i++) {
      var next = add(item.pos, delta(dirs[i]));
      var k = key(next);
      if (seen[k] || !isOpen(next, map)) continue;
      seen[k] = true;
      queue.push({ pos: next, first: item.first || next });
    }
  }
  return null;
}

function canShoot(a, b, map) {
  if (a[0] !== b[0] && a[1] !== b[1]) return false;
  var dir = directionTo(a, b);
  var step = delta(dir);
  var pos = add(a, step);
  while (!samePos(pos, b)) {
    if (!isOpen(pos, map)) return false;
    pos = add(pos, step);
  }
  return true;
}

function isAligned(a, b) {
  return a && b && (a[0] === b[0] || a[1] === b[1]);
}

function directionTo(a, b) {
  if (b[0] > a[0]) return "right";
  if (b[0] < a[0]) return "left";
  if (b[1] > a[1]) return "down";
  return "up";
}

function turnDirection(currentDir, targetDir) {
  var dirs = ["up", "right", "down", "left"];
  var cur = dirs.indexOf(currentDir);
  var tgt = dirs.indexOf(targetDir);
  if (cur < 0 || tgt < 0) return "right";
  var diff = (tgt - cur + 4) % 4;
  return diff === 3 ? "left" : "right";
}

function delta(dir) {
  if (dir === "up") return [0, -1];
  if (dir === "right") return [1, 0];
  if (dir === "down") return [0, 1];
  return [-1, 0];
}

function add(pos, d) { return [pos[0] + d[0], pos[1] + d[1]]; }
function isOpen(pos, map) {
  if (!map[pos[0]]) return false;
  var cell = map[pos[0]][pos[1]];
  return cell && cell !== "x" && cell !== "m";
}
function samePos(a, b) { return a[0] === b[0] && a[1] === b[1]; }
function key(pos) { return pos[0] + "," + pos[1]; }
