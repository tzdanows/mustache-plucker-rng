# Testing Checklist - Moustache Plucker Bot

## Pre-Launch Testing

### ✅ Environment Setup
- [ ] Deno installed (v1.37+)
- [ ] `.env` file configured with valid tokens
- [ ] Database initialized (`deno task db:init`)
- [ ] Dependencies cached (`deno cache src/deps.ts`)

### ✅ Unit Tests
Run: `deno task test:unit`
- [ ] Database operations pass
- [ ] Giveaway CRUD operations work
- [ ] Participant management functions correctly
- [ ] Random winner selection is fair

### ✅ Bot Connection
Run: `deno task dev`
- [ ] Bot connects successfully
- [ ] No errors in console
- [ ] "Bot is ready!" message appears
- [ ] Giveaway manager starts

## Discord Testing

### ✅ Basic Commands
- [ ] `/ping` - Returns latency
- [ ] `/stats` - Shows statistics
- [ ] Commands appear in Discord slash menu

### ✅ Giveaway Creation
Test: `/giveaway create item:"Test Prize" duration:2 winners:1`
- [ ] Embed message created
- [ ] 🎉 reaction auto-added
- [ ] Timer shows correct end time
- [ ] Database entry created

### ✅ Entry System
- [ ] Click 🎉 to enter giveaway
- [ ] Entry confirmed (check participant count)
- [ ] Remove reaction to leave
- [ ] Cannot enter ended giveaways
- [ ] Duplicate entries prevented

### ✅ Giveaway Management
- [ ] `/giveaway list` shows active giveaways
- [ ] `/giveaway end <id>` manually ends giveaway
- [ ] `/giveaway cancel <id>` cancels giveaway
- [ ] Only creator/admin can end/cancel

### ✅ Winner Selection
- [ ] Automatic ending at timer expiry
- [ ] Winners announced correctly
- [ ] Winner mentions work
- [ ] No winners message if no participants
- [ ] Winners saved to database

### ✅ Error Handling
- [ ] Invalid command parameters show errors
- [ ] Database errors handled gracefully
- [ ] Permission errors show appropriate messages
- [ ] Bot recovers from disconnections

## Performance Testing

### ✅ Load Testing
- [ ] Create giveaway with 100+ participants
- [ ] Multiple concurrent giveaways (5+)
- [ ] Reaction spam handling
- [ ] Database query performance

### ✅ Edge Cases
- [ ] More winners than participants
- [ ] Zero participants
- [ ] Bot restart during active giveaway
- [ ] Very long duration (30 days)
- [ ] Very short duration (1 minute)

## Security Testing

### ✅ Permissions
- [ ] Non-admins cannot end others' giveaways
- [ ] Bot permissions are minimal required
- [ ] Token not exposed in logs
- [ ] SQL injection prevention

### ✅ Rate Limiting
- [ ] Command spam protection
- [ ] Reaction rate limiting
- [ ] Database connection pooling

## Production Readiness

### ✅ Deployment
- [ ] Production `.env` configured
- [ ] Global command deployment works
- [ ] Logging configured appropriately
- [ ] Error reporting setup

### ✅ Documentation
- [ ] README.md is complete
- [ ] SETUP.md has all steps
- [ ] QUICKSTART.md works for new users
- [ ] Commands documented

### ✅ Monitoring
- [ ] Uptime tracking
- [ ] Error logs accessible
- [ ] Database backup plan
- [ ] Update mechanism ready

## Test Data Cleanup

After testing:
```bash
# Remove test database
rm -rf data/

# Recreate clean database
deno task db:init

# Optional: Add seed data
deno task db:seed
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Commands not showing | Wait 1-2 minutes, refresh Discord |
| Bot offline | Check token, ensure bot is running |
| Cannot add reactions | Check bot permissions |
| Database locked | Restart bot, check file permissions |
| FFI errors | Add `--allow-ffi` flag |

## Test Coverage Report

Run full test suite:
```bash
deno task test
```

Expected output:
- All 7+ tests passing
- No errors or warnings
- Database operations successful

---

✅ **Ready for Production** when all checklist items pass!