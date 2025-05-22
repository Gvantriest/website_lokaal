# Supabase Row Level Security (RLS) Policies for the `recipes` Table

Row Level Security (RLS) is a PostgreSQL feature that allows you to control which rows users can access or modify in a table. It's crucial for multi-tenant applications or any application where users should only interact with their own data.

Below are example RLS policies for the `recipes` table. These are common starting points and should be reviewed and adapted to your specific application's security requirements.

**Important:** Before applying these policies, ensure that RLS is enabled on the `recipes` table. This was likely done in your `schema.sql` file (e.g., `ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;`).

These policies assume you have a column named `user_id` in your `recipes` table that stores the ID of the user who owns the recipe, and that this ID corresponds to `auth.uid()` from Supabase authentication.

## Example RLS Policies

### 1. SELECT Policy: Authenticated users can select (read) their own recipes.

This policy allows users to retrieve only the recipes they have created.

```sql
CREATE POLICY "Enable read access for own recipes"
ON recipes
FOR SELECT
USING (auth.uid() = user_id);
```

### 2. INSERT Policy: Authenticated users can insert (create) new recipes for themselves.

This policy allows users to add new recipes, automatically associating the new recipe with their `user_id`.

```sql
CREATE POLICY "Enable insert for own recipes"
ON recipes
FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

### 3. UPDATE Policy (Optional but good practice): Authenticated users can update their own recipes.

This policy allows users to modify only the recipes they own. The `USING` clause ensures they can only target their own recipes for an update operation, and the `WITH CHECK` clause ensures they cannot change the `user_id` to someone else's or disassociate it from themselves during an update.

```sql
CREATE POLICY "Enable update for own recipes"
ON recipes
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### 4. DELETE Policy (Optional but good practice): Authenticated users can delete their own recipes.

This policy allows users to remove only the recipes they own.

```sql
CREATE POLICY "Enable delete for own recipes"
ON recipes
FOR DELETE
USING (auth.uid() = user_id);
```

## How to Apply These Policies

You can add these SQL statements using the Supabase dashboard:

1.  Navigate to your project in the Supabase dashboard.
2.  Go to the **SQL Editor**.
3.  Paste the `CREATE POLICY` statements into the editor and run them.

Alternatively, for each table:
1. Go to **Authentication** > **Policies**.
2. Select the `recipes` table.
3. Click on "New Policy" and configure them using the UI, or switch to the SQL mode for each policy.

Remember to thoroughly test your RLS policies to ensure they behave as expected and provide the intended level of data security for your application.