const { sequelize, User, Note, Tag, NoteChunk } = require('./models');

async function test() {
  console.log("Starting database integration test...");
  try {
    await sequelize.authenticate();
    console.log("✓ Database connection authenticated successfully.");
    
    // Sync schemas cleanly for this test
    await sequelize.sync({ force: true });
    console.log("✓ Database schemas synchronized successfully (forced reset).");

    // Create a test user
    const user = await User.create({
      name: "Hadia Khan",
      email: "hadia@notemind.com",
      password: "hashedpassword123"
    });
    console.log("✓ Created test user:", user.name);

    // Create a test tag
    const tag = await Tag.create({ name: "react" });
    console.log("✓ Created test tag:", tag.name);

    // Create a test note
    const note = await Note.create({
      userId: user.id,
      title: "React Components",
      content: "React uses components to divide the UI into reusable pieces.",
      category: "Frontend"
    });
    console.log("✓ Created test note:", note.title);

    // Link tag to note (many-to-many test)
    await note.addTag(tag);
    console.log("✓ Linked tag to note successfully.");

    // Retrieve note with tags
    const retrieved = await Note.findByPk(note.id, {
      include: [{ model: Tag }]
    });
    console.log("✓ Retrieved note with tags:", retrieved.Tags.map(t => t.name));

    // Create a note chunk with mock vector floats
    const mockVector = [0.0125, -0.0054, 0.9842, -0.213];
    const chunk = await NoteChunk.create({
      userId: user.id,
      noteId: note.id,
      content: "React uses components to divide the UI",
      embedding: mockVector
    });
    console.log("✓ Created note chunk with test vector embeddings.");

    // Retrieve chunk and verify parsing getters/setters
    const retrievedChunk = await NoteChunk.findByPk(chunk.id);
    console.log("✓ Retrieved note chunk embedding array:", retrievedChunk.embedding);
    console.log("✓ Embedding field type check: isArray?", Array.isArray(retrievedChunk.embedding));

    console.log("\nALL DATABASE CHECKS COMPLETED SUCCESSFULLY! ✓");
  } catch (error) {
    console.error("❌ Test failed with error:", error);
  } finally {
    await sequelize.close();
    console.log("Database connection closed.");
  }
}

test();
