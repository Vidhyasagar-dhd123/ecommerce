from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0002_alter_user_options_remove_user_bio_user_phone_and_more"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="address",
            name="unique_default_address_per_user",
        ),
        migrations.AddConstraint(
            model_name="address",
            constraint=models.UniqueConstraint(
                condition=models.Q(is_default=True),
                fields=("customer", "type"),
                name="unique_default_address_per_customer_type",
            ),
        ),
    ]