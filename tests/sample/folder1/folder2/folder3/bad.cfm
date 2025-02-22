<cfquery>
		SELECT * FROM users WHERE id = #url.id#
</cfquery>

<script>
		function helloworld() {
				alert('Hello World');
		}
		helloworld();

		sql = "SELECT * FROM users WHERE id = " + url.id;

		queryExecute(sql);

		queryExecute("SELECT * FROM employees", {}, {"datasource": "cfdocexamples"});
</script>

<style>
	body {
	background-color: red;
	}
</style>

<cfscript>

	dump("Hello world");
</cfscript>
